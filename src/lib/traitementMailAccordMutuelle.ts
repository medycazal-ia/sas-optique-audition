import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { enregistrerFichier } from "@/lib/stockageFichiers";
import { assurerCodePaiement } from "@/lib/codePaiement";
import { extraireAccordMutuelle, extraireAccordMutuelleDepuisTexte, type ResultatExtractionAccordMutuelle } from "@/lib/ocrAccordMutuelle";
import { totalPropositionApresRemise } from "@/lib/remiseProposition";

/**
 * Traitement d'un mail entrant potentiellement pertinent pour une demande de
 * prise en charge mutuelle — reçu via un scénario Make qui surveille une ou
 * plusieurs boîtes mail (voir prisma BoiteMailTiersPayant) et relaie chaque
 * mail avec pièce jointe à /api/automatisations/accord-mutuelle-entrant.
 *
 * Filtre de pertinence (avant toute extraction, pour limiter le bruit et le
 * coût OCR) : nom ET prénom ensemble d'un patient DU SITE (peu importe qu'il
 * ait une demande en attente, déjà acceptée ou déjà refusée), cherchés dans
 * le sujet, le corps ou le nom de la pièce jointe — et rien d'autre (ni
 * mots-clés génériques type "accord"/"prise en charge", ni nom de famille
 * seul). Un nom de famille seul peut apparaître par pure coïncidence dans un
 * mail sans rapport (signature de l'expéditeur, société, tiers cité) —
 * constaté en production avec un patient dont le nom de famille coïncidait
 * avec celui de l'opticien lui-même, ce qui faisait attacher des documents
 * sans rapport au mauvais dossier. Exiger nom+prénom ensemble élimine ce
 * risque : c'est une coïncidence bien plus improbable.
 *
 * Principe de prudence ("il ne doit y avoir aucune erreur") : le dossier est
 * identifié sans ambiguïté dès que le nom+prénom collés ci-dessus désignent
 * une seule personne, mais un changement de statut ACCORD/REFUS n'est
 * appliqué automatiquement que si cette personne a par ailleurs une (et une
 * seule) demande en attente ET que les informations nécessaires à cette
 * transition précise sont toutes présentes (montant + numéro d'accord pour
 * un ACCORD). Dans tous les autres cas : le document est tout de même
 * enregistré sur le dossier identifié (pour qu'un humain finisse la saisie
 * en un clic, voir CaptureNumeroAccord), et l'événement est journalisé pour
 * traçabilité — jamais de modification silencieuse ni de devinette.
 */

export type PayloadMailEntrant = {
  from: string;
  subject: string;
  bodyText: string;
  messageId?: string;
  // `unknown` plutôt que `string` : certains scénarios Make sérialisent un
  // champ binaire mal mappé en objet plutôt qu'en base64 (voir versBuffer
  // ci-dessous) — mieux vaut le typer honnêtement que de faire confiance à
  // l'appelant.
  attachments: { fileName: string; contentType: string; contentBase64: unknown }[];
};

/**
 * Décode une pièce jointe reçue du webhook — normalement une chaîne
 * base64, mais tolère aussi un objet "Buffer" JSON (`{type:"Buffer",
 * data:[...]}`) ou un tableau d'octets brut : un scénario Make mal
 * configuré (champ binaire mappé sans passer par `base64(...)`) peut
 * envoyer l'une ou l'autre forme selon le connecteur mail utilisé.
 */
function versBuffer(valeur: unknown): Buffer | null {
  if (typeof valeur === "string" && valeur.trim()) {
    return Buffer.from(valeur, "base64");
  }
  if (Array.isArray(valeur)) {
    return Buffer.from(valeur as number[]);
  }
  if (valeur && typeof valeur === "object" && Array.isArray((valeur as { data?: unknown }).data)) {
    return Buffer.from((valeur as { data: number[] }).data);
  }
  return null;
}

export type ResultatTraitementMail = {
  traite: boolean; // false si aucun patient du site (nom+prénom) n'a été reconnu
  apparie: boolean; // true si un dossier a été identifié sans ambiguïté
  personneId: string | null;
  demandeId: string | null;
  action: "ACCORD" | "REFUS" | "DOCUMENT_SEUL" | null;
  raison: string;
};

function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .toLowerCase()
    .trim();
}

const STATUTS_EN_ATTENTE = ["A_ENVOYER", "ENVOYEE", "EN_ATTENTE"] as const;

type PersonneEnAttente = Awaited<ReturnType<typeof prisma.personne.findMany>>[number];

/** Retire l'extension d'un nom de fichier avant normalisation ("PEC Malika CAZAL.pdf" -> "pec malika cazal"). */
function normaliserNomFichier(nomFichier: string): string {
  return normaliser(nomFichier.replace(/\.[a-z0-9]{2,5}$/i, ""));
}

/** Échappe les caractères spéciaux d'une regex dans une chaîne utilisateur (nom/prénom). */
function echapperRegex(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Noms de plateformes tiers payant / mutuelles connues — à enrichir au fil
 * de l'eau (Viamedis, puis d'autres au besoin). Sert uniquement de signal
 * complémentaire pour confirmer qu'un mail est bien lié à une mutuelle
 * quand la personne identifiée n'a aucune demande en attente : sans lui, un
 * mail personnel sans rapport mentionnant par coïncidence le nom complet du
 * patient (facture, confirmation d'achat...) serait rattaché à tort à son
 * dossier — jamais utilisé comme critère d'identification du patient
 * lui-même (voir patientDepuisTexte, qui reste nom+prénom uniquement).
 */
const PLATEFORMES_MUTUELLES_CONNUES = ["viamedis"];

function contientPlateformeMutuelleConnue(texteNormalise: string): boolean {
  return PLATEFORMES_MUTUELLES_CONNUES.some((p) => texteNormalise.includes(p));
}

/**
 * Cherche, parmi TOUS les patients du site (peu importe qu'ils aient une
 * demande en attente, déjà acceptée ou déjà refusée — un mail peut concerner
 * un dossier déjà tranché : correction, nouvelle pièce, appel d'un refus...),
 * celui dont le nom ET le prénom apparaissent COLLÉS L'UN À L'AUTRE (dans un
 * ordre ou l'autre, séparés seulement par des espaces — "malika cazal" ou
 * "cazal malika") dans un texte déjà normalisé (sujet, corps du mail, ou nom
 * de la pièce jointe — voir les trois appels dans traiterMailAccordMutuelle,
 * chacun dans l'ordre de priorité demandé : sujet, puis corps, puis nom du
 * fichier).
 *
 * Ni le nom seul, ni le nom et le prénom présents séparément quelque part
 * dans le texte, ne suffisent : les deux constatés en production comme
 * source de faux positifs (nom coïncidant avec un tiers cité dans le corps
 * du mail — signature, société — ; un mail listant plusieurs personnes dont
 * le nom ET le prénom du patient apparaissent chacun ailleurs dans le texte,
 * sans rapport l'un avec l'autre). Exiger qu'ils soient accolés, comme dans
 * un vrai nom complet écrit intentionnellement, élimine ces deux risques.
 * N'en retourne un que si un seul patient correspond (ambiguïté entre
 * plusieurs personnes -> null, jamais de choix arbitraire).
 */
function patientDepuisTexte(texteNormalise: string, personnes: PersonneEnAttente[]): { id: string; nom: string; prenom: string } | null {
  if (!texteNormalise) return null;
  const correspondances = new Map<string, PersonneEnAttente>();
  for (const p of personnes) {
    const nom = normaliser(p.nom);
    const prenom = p.prenom ? normaliser(p.prenom) : null;
    if (nom.length < 2 || !prenom || prenom.length < 2) continue;
    const nomEch = echapperRegex(nom);
    const prenomEch = echapperRegex(prenom);
    const motsColles = new RegExp(`\\b(${prenomEch}\\s+${nomEch}|${nomEch}\\s+${prenomEch})\\b`);
    if (motsColles.test(texteNormalise)) {
      correspondances.set(p.id, p);
    }
  }
  if (correspondances.size !== 1) return null;

  const personne = [...correspondances.values()][0];
  return { id: personne.id, nom: personne.nom, prenom: personne.prenom! };
}

export async function traiterMailAccordMutuelle(payload: PayloadMailEntrant): Promise<ResultatTraitementMail> {
  // Identification du patient — ordre de priorité strict : sujet du mail,
  // puis corps du mail, puis nom de la pièce jointe, et seulement en tout
  // dernier recours le contenu du document lui-même (OCR/vision, le plus
  // coûteux et le moins fiable des quatre — un vrai courrier de mutuelle nomme
  // presque toujours le patient dans le sujet, le corps ou le nom du fichier).
  // Recherche parmi TOUS les dossiers du site, pas seulement ceux ayant une
  // demande en attente : un mail peut concerner un dossier déjà tranché
  // (accord ou refus déjà enregistré) — pièce complémentaire, correction,
  // appel d'un refus... — et doit quand même être rattaché au bon dossier.
  const toutesLesPersonnes = await prisma.personne.findMany();
  const personneParId = new Map(toutesLesPersonnes.map((p) => [p.id, p]));

  const sujetNormalise = normaliser(payload.subject);
  const corpsNormalise = normaliser(payload.bodyText);
  const nomsFichiersNormalises = payload.attachments
    .map((a) => a.fileName)
    .filter(Boolean)
    .map(normaliserNomFichier)
    .join(" ");

  const patientSujet = patientDepuisTexte(sujetNormalise, toutesLesPersonnes);
  const patientCorps = patientDepuisTexte(corpsNormalise, toutesLesPersonnes);
  const patientFichier = patientDepuisTexte(nomsFichiersNormalises, toutesLesPersonnes);
  const patientDeterministe = patientSujet ?? patientCorps ?? patientFichier;

  // Seul critère de pertinence : nom ET prénom d'un patient du site trouvés
  // ensemble (sujet, corps, ou nom du fichier) — rien d'autre. Pas de
  // mots-clés génériques ("accord", "prise en charge"...), qui déclenchent
  // trop de faux positifs sur du courrier sans rapport ; pas de nom seul, qui
  // peut coïncider avec autre chose (voir patientDepuisTexte).
  if (!patientDeterministe) {
    return { traite: false, apparie: false, personneId: null, demandeId: null, action: null, raison: "Nom et prénom d'aucun patient du site reconnus dans le sujet, le corps ou le nom du fichier — mail ignoré." };
  }
  const personneId = patientDeterministe.id;
  const personneApparie = personneParId.get(personneId)!;

  // Extraction depuis le document — toujours nécessaire pour statut/motif de
  // refus/montant/numéro d'accord (uniquement disponibles là), même quand le
  // patient est déjà identifié par les sources ci-dessus. Le corps du mail
  // complète ces mêmes champs quand il n'y a pas de pièce jointe exploitable.
  let extraction: ResultatExtractionAccordMutuelle = {
    numeroAccord: null,
    statut: null,
    motifRefus: null,
    montantPriseEnChargeTTC: null,
    patientNom: null,
    patientPrenom: null,
    patientNumeroSecuriteSociale: null,
    mutuelleNom: null,
  };
  const piece = payload.attachments.find((a) => a.contentBase64 && a.fileName);
  const contenuPiece = piece ? versBuffer(piece.contentBase64) : null;
  if (piece && !contenuPiece) {
    console.error("traiterMailAccordMutuelle — format de pièce jointe non reconnu :", typeof piece.contentBase64);
  }
  if (piece && contenuPiece) {
    try {
      extraction = await extraireAccordMutuelle(contenuPiece, piece.fileName);
    } catch (e) {
      console.error("traiterMailAccordMutuelle — échec extraction pièce jointe :", e);
    }
  }
  const champsManquants = !extraction.numeroAccord && !extraction.statut && !extraction.patientNom && !extraction.patientNumeroSecuriteSociale;
  if (champsManquants && payload.bodyText.trim()) {
    try {
      const extractionTexte = await extraireAccordMutuelleDepuisTexte(payload.subject, payload.bodyText);
      extraction = { ...extractionTexte, ...Object.fromEntries(Object.entries(extraction).filter(([, v]) => v !== null)) };
    } catch (e) {
      console.error("traiterMailAccordMutuelle — échec extraction texte :", e);
    }
  }

  // Le patient identifié par sujet/corps/nom-de-fichier (garde-fou nom+prénom
  // ensemble, voir patientDepuisTexte) prime toujours sur ce que l'OCR/l'IA a
  // cru lire dans le document ou le corps du mail.
  extraction = { ...extraction, patientNom: patientDeterministe.nom, patientPrenom: patientDeterministe.prenom };

  // Rapprochement — le dossier est déjà identifié sans ambiguïté (nom+prénom
  // collés, voir patientDepuisTexte) : reste à savoir s'il a une demande en
  // attente à mettre à jour automatiquement. S'il n'en a aucune (déjà
  // acceptée, déjà refusée, ou aucune demande du tout), le document est quand
  // même enregistré sur son dossier ci-dessous — seule la mise à jour
  // automatique du statut ACCORD/REFUS nécessite une demande en attente.
  let demandesPersonne = await prisma.demandePriseEnCharge.findMany({
    where: { personneId, statut: { in: [...STATUTS_EN_ATTENTE] } },
  });

  // Plusieurs demandes en attente pour cette personne (principale + secondaire) :
  // on tente de départager via le nom de mutuelle extrait, sinon on n'applique rien.
  if (demandesPersonne.length > 1 && extraction.mutuelleNom) {
    const mutuelleCible = normaliser(extraction.mutuelleNom);
    const affinees = demandesPersonne.filter((d) => {
      const nomMutuelleDuRang = d.rang === "SECONDAIRE" ? personneApparie.mutuelle2Nom : personneApparie.mutuelleNom;
      return nomMutuelleDuRang ? normaliser(nomMutuelleDuRang).includes(mutuelleCible) || mutuelleCible.includes(normaliser(nomMutuelleDuRang)) : false;
    });
    if (affinees.length === 1) demandesPersonne = affinees;
  }

  // Document : enregistré sur le dossier dès qu'on l'a, dossier identifié —
  // qu'on puisse ou non appliquer automatiquement la transition de statut.
  // Si la personne n'a aucune demande en attente, on exige en plus qu'une
  // plateforme mutuelle connue soit mentionnée (voir
  // PLATEFORMES_MUTUELLES_CONNUES) avant d'enregistrer quoi que ce soit :
  // sans demande en attente à mettre à jour, mieux vaut ne rien enregistrer
  // qu'attacher par erreur un mail personnel sans rapport (facture,
  // confirmation d'achat...) au dossier médical du patient.
  const plateformeReconnue = contientPlateformeMutuelleConnue(`${sujetNormalise} ${corpsNormalise} ${nomsFichiersNormalises}`);
  let documentEnregistre = false;
  if (piece && contenuPiece && (demandesPersonne.length > 0 || plateformeReconnue)) {
    try {
      const { cheminStockage } = await enregistrerFichier(personneId, piece.fileName, contenuPiece);
      await prisma.document.create({ data: { personneId, type: "REPONSE_MUTUELLE", nomFichier: piece.fileName, cheminStockage } });
      documentEnregistre = true;
    } catch (e) {
      console.error("traiterMailAccordMutuelle — échec enregistrement document :", e);
    }
  }

  if (demandesPersonne.length === 0) {
    await journaliser({
      type: "demande-mutuelle.mail_apparie_sans_demande_en_attente",
      entite: "Personne",
      entiteId: personneId,
      personneId,
      acteur: "automatisation-mail",
      donnees: { subject: payload.subject, from: payload.from, extraction, documentEnregistre },
    });
    return {
      traite: true,
      apparie: true,
      personneId,
      demandeId: null,
      action: documentEnregistre ? "DOCUMENT_SEUL" : null,
      raison: documentEnregistre
        ? "Dossier identifié mais aucune demande en attente pour cette personne (déjà acceptée/refusée, ou aucune demande) — plateforme mutuelle reconnue dans le mail, document enregistré sur son dossier, statut non modifié."
        : "Dossier identifié mais aucune demande en attente pour cette personne, et aucune plateforme mutuelle connue mentionnée dans le mail — probablement sans rapport, document non enregistré.",
    };
  }

  if (demandesPersonne.length !== 1) {
    await journaliser({
      type: "demande-mutuelle.mail_apparie_ambigu",
      entite: "Personne",
      entiteId: personneId,
      personneId,
      acteur: "automatisation-mail",
      donnees: { subject: payload.subject, from: payload.from, extraction, documentEnregistre },
    });
    return {
      traite: true,
      apparie: true,
      personneId,
      demandeId: null,
      action: documentEnregistre ? "DOCUMENT_SEUL" : null,
      raison: "Dossier identifié mais plusieurs demandes en attente indissociables — document enregistré, statut non modifié.",
    };
  }

  const demande = demandesPersonne[0];
  const enTeteJournal = { subject: payload.subject, from: payload.from, extraction, documentEnregistre };

  if (extraction.statut === "REFUS") {
    await prisma.demandePriseEnCharge.update({
      where: { id: demande.id },
      data: { statut: "REFUS", reponseA: new Date(), motifRefus: extraction.motifRefus },
    });
    await journaliser({
      type: "demande-mutuelle.refus_detecte_mail",
      entite: "DemandePriseEnCharge",
      entiteId: demande.id,
      personneId,
      acteur: "automatisation-mail",
      donnees: enTeteJournal,
    });
    return { traite: true, apparie: true, personneId, demandeId: demande.id, action: "REFUS", raison: "Refus détecté et appliqué automatiquement." };
  }

  if (extraction.statut === "ACCORD" && extraction.montantPriseEnChargeTTC !== null && extraction.numeroAccord) {
    const proposition = await prisma.proposition.findUnique({ where: { id: demande.propositionId }, include: { lignes: true } });
    const totalProposition = proposition ? totalPropositionApresRemise(proposition.lignes) : 0;
    const resteAChargeTTC = Math.max(0, totalProposition - extraction.montantPriseEnChargeTTC);

    await prisma.$transaction([
      prisma.demandePriseEnCharge.update({
        where: { id: demande.id },
        data: { statut: "ACCORD", reponseA: new Date(), montantPriseEnChargeTTC: extraction.montantPriseEnChargeTTC },
      }),
      prisma.proposition.update({ where: { id: demande.propositionId }, data: { resteAChargeTTC } }),
    ]);
    await assurerCodePaiement(demande.id, extraction.numeroAccord);

    await journaliser({
      type: "demande-mutuelle.accord_detecte_mail",
      entite: "DemandePriseEnCharge",
      entiteId: demande.id,
      personneId,
      acteur: "automatisation-mail",
      donnees: { ...enTeteJournal, resteAChargeTTC },
    });
    return { traite: true, apparie: true, personneId, demandeId: demande.id, action: "ACCORD", raison: "Accord détecté et appliqué automatiquement (montant et numéro d'accord tous deux extraits)." };
  }

  await journaliser({
    type: "demande-mutuelle.mail_apparie_incomplet",
    entite: "DemandePriseEnCharge",
    entiteId: demande.id,
    personneId,
    acteur: "automatisation-mail",
    donnees: enTeteJournal,
  });
  return {
    traite: true,
    apparie: true,
    personneId,
    demandeId: demande.id,
    action: documentEnregistre ? "DOCUMENT_SEUL" : null,
    raison: "Dossier identifié mais informations insuffisantes pour appliquer automatiquement un accord/refus — document enregistré si présent, à finaliser à la main.",
  };
}
