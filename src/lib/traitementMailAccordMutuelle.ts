import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { enregistrerFichier } from "@/lib/stockageFichiers";
import { assurerCodePaiement } from "@/lib/codePaiement";
import { extraireAccordMutuelle, extraireAccordMutuelleDepuisTexte, type ResultatExtractionAccordMutuelle } from "@/lib/ocrAccordMutuelle";

/**
 * Traitement d'un mail entrant potentiellement pertinent pour une demande de
 * prise en charge mutuelle — reçu via un scénario Make qui surveille une ou
 * plusieurs boîtes mail (voir prisma BoiteMailTiersPayant) et relaie chaque
 * mail avec pièce jointe à /api/automatisations/accord-mutuelle-entrant.
 *
 * Filtre de pertinence (avant toute extraction, pour limiter le bruit et le
 * coût OCR) : mots-clés habituels (accord/refus/rejet/pec) OU nom d'un
 * patient ayant une demande en attente — un modèle de mail de mutuelle sans
 * les mots-clés usuels ne doit pas passer à la trappe alors que le nom du
 * patient, lui, est toujours présent.
 *
 * Principe de prudence ("il ne doit y avoir aucune erreur") : n'applique
 * automatiquement un changement de statut ACCORD/REFUS que lorsque le
 * dossier concerné est identifié sans ambiguïté (numéro de sécurité sociale
 * en priorité, sinon nom+prénom exacts, sinon nom seul si le prénom n'est
 * pas fourni par le document — dans tous les cas une seule personne ET une
 * seule demande en attente pour cette personne) ET que les informations
 * nécessaires à cette transition
 * précise sont toutes présentes (montant + numéro d'accord pour un ACCORD).
 * Dans tous les autres cas : le document est tout de même enregistré sur le
 * dossier si un dossier a pu être identifié (pour qu'un humain finisse la
 * saisie en un clic, voir CaptureNumeroAccord), et l'événement est journalisé
 * pour traçabilité — jamais de modification silencieuse ni de devinette.
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
  traite: boolean; // false si le mail a été ignoré (mots-clés absents)
  apparie: boolean; // true si un dossier a été identifié sans ambiguïté
  personneId: string | null;
  demandeId: string | null;
  action: "ACCORD" | "REFUS" | "DOCUMENT_SEUL" | null;
  raison: string;
};

const MOTS_CLES_PERTINENCE = /\b(accord|refus|rejet|rejete|rejetee|prise\s*en\s*charge|p\.?e\.?c\.?)\b/i;

function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .toLowerCase()
    .trim();
}

const STATUTS_EN_ATTENTE = ["A_ENVOYER", "ENVOYEE", "EN_ATTENTE"] as const;

export async function traiterMailAccordMutuelle(payload: PayloadMailEntrant): Promise<ResultatTraitementMail> {
  const texteRecherche = `${payload.subject}\n${payload.bodyText}`;
  const texteRechercheNormalise = normaliser(texteRecherche);

  // Identification du dossier — NSS en priorité (le plus fiable), sinon
  // nom+prénom exacts, sinon nom seul si le document ne donne pas le prénom.
  // DemandePriseEnCharge.personneId n'est pas une relation Prisma déclarée
  // (voir schema.prisma) : on rejoint donc les deux requêtes à la main.
  // Récupéré avant le filtre mots-clés : le nom du patient, toujours présent
  // dans un vrai mail de mutuelle, sert aussi de signal de pertinence (voir
  // ci-dessous) — un modèle de mail sans les mots-clés habituels ne doit pas
  // faire passer à la trappe un vrai accord/refus.
  const demandesEnAttente = await prisma.demandePriseEnCharge.findMany({
    where: { statut: { in: [...STATUTS_EN_ATTENTE] } },
  });
  const personnesConcernees = await prisma.personne.findMany({
    where: { id: { in: [...new Set(demandesEnAttente.map((d) => d.personneId))] } },
  });
  const personneParId = new Map(personnesConcernees.map((p) => [p.id, p]));

  const nomPatientEnAttentePresent = personnesConcernees.some((p) => {
    const nom = normaliser(p.nom);
    return nom.length >= 2 && texteRechercheNormalise.includes(nom);
  });

  if (!MOTS_CLES_PERTINENCE.test(texteRecherche) && !nomPatientEnAttentePresent) {
    return { traite: false, apparie: false, personneId: null, demandeId: null, action: null, raison: "Mots-clés absents et aucun nom de patient en attente reconnu — mail ignoré." };
  }

  // Extraction : la pièce jointe (document officiel) fait foi en priorité ;
  // le corps du mail complète les champs qu'elle n'aurait pas fournis.
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

  // Rapprochement — demandesEnAttente/personnesConcernees/personneParId déjà
  // récupérées plus haut (elles servent aussi au filtre de pertinence).
  let candidates = demandesEnAttente;
  if (extraction.patientNumeroSecuriteSociale) {
    const nss = extraction.patientNumeroSecuriteSociale.replace(/\s+/g, "");
    candidates = candidates.filter((d) => personneParId.get(d.personneId)?.numeroSecuriteSociale?.replace(/\s+/g, "") === nss);
  } else if (extraction.patientNom && extraction.patientPrenom) {
    const nomCible = normaliser(extraction.patientNom);
    const prenomCible = normaliser(extraction.patientPrenom);
    candidates = candidates.filter((d) => {
      const p = personneParId.get(d.personneId);
      return p && normaliser(p.nom) === nomCible && p.prenom && normaliser(p.prenom) === prenomCible;
    });
  } else if (extraction.patientNom) {
    // Le prénom n'est pas toujours présent dans le courrier (certains ne
    // mentionnent que le nom de famille) — recherche sur le nom seul ; la
    // vérification d'unicité juste en dessous (une seule personne, une
    // seule demande en attente) reste le garde-fou contre toute erreur.
    const nomCible = normaliser(extraction.patientNom);
    candidates = candidates.filter((d) => normaliser(personneParId.get(d.personneId)?.nom ?? "") === nomCible);
  } else {
    return { traite: true, apparie: false, personneId: null, demandeId: null, action: null, raison: "Mots-clés présents mais patient non identifiable (ni NSS ni nom/prénom extraits)." };
  }

  const personneIds = [...new Set(candidates.map((d) => d.personneId))];
  if (personneIds.length === 0) {
    return { traite: true, apparie: false, personneId: null, demandeId: null, action: null, raison: "Aucun dossier en attente ne correspond au patient identifié." };
  }
  if (personneIds.length > 1) {
    return { traite: true, apparie: false, personneId: null, demandeId: null, action: null, raison: "Plusieurs dossiers correspondent (NSS ou nom/prénom ambigus) — traitement manuel requis." };
  }
  const personneId = personneIds[0];
  const personneApparie = personneParId.get(personneId)!;
  let demandesPersonne = candidates.filter((d) => d.personneId === personneId);

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
  let documentEnregistre = false;
  if (piece && contenuPiece) {
    try {
      const { cheminStockage } = await enregistrerFichier(personneId, piece.fileName, contenuPiece);
      await prisma.document.create({ data: { personneId, type: "REPONSE_MUTUELLE", nomFichier: piece.fileName, cheminStockage } });
      documentEnregistre = true;
    } catch (e) {
      console.error("traiterMailAccordMutuelle — échec enregistrement document :", e);
    }
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
    const totalProposition = proposition ? proposition.lignes.reduce((s, l) => s + l.prixUnitaireTTC * l.quantite, 0) : 0;
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
