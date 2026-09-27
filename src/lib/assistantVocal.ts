import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { creerClientAnthropic } from "@/lib/anthropicClient";
import { declencherRechercheAccordMutuelle } from "@/lib/rechercheAccordMutuelle";
import { repasserDemandeEnAttente } from "@/lib/repasserEnAttente";
import { journaliser } from "@/lib/evenements";
import { REMISES_AUTORISEES, estRemiseAutorisee } from "@/lib/remiseProposition";

/**
 * Assistant vocal — pas de grammaire de commandes figée façon "Hey Google" :
 * le navigateur transcrit la voix en texte libre (voir components/AssistantVocal.tsx),
 * et c'est l'IA qui choisit ici, parmi un ensemble FERMÉ d'actions autorisées
 * (voir OUTILS), laquelle correspond à la demande — jamais une exécution de
 * texte libre ou une URL construite à partir de ce que dit l'IA : chaque
 * outil ne peut produire qu'un résultat prévu à l'avance (une recherche
 * Prisma classique, une URL choisie dans DESTINATIONS_CONNUES, ou — pour les
 * actions qui modifient des données — une demande de confirmation dont
 * l'exécution réelle repasse par ACTIONS_CONFIRMABLES, jamais directement).
 */

const MODELE = process.env.ANTHROPIC_MODELE_ASSISTANT_VOCAL ?? "claude-sonnet-5";

const DESTINATIONS_CONNUES: Record<string, string> = {
  accueil: "/",
  dossiers: "/dossiers",
  produits: "/produits",
  fournisseurs: "/fournisseurs",
  paiements: "/paiements",
  utilisateurs: "/utilisateurs",
};

const OUTILS: Anthropic.Tool[] = [
  {
    name: "chercher_patient",
    description:
      "Recherche un patient par nom, prénom ou numéro de sécurité sociale pour ouvrir son dossier. À utiliser dès que l'utilisateur nomme une personne (ex: \"ouvre le dossier de Malika Cazal\", \"cherche Dupont\", \"cherche Malika Cazal\", \"trouve-moi le dossier de Medy\").",
    input_schema: {
      type: "object",
      properties: {
        requete: {
          type: "string",
          description:
            "Nom et/ou prénom (ou numéro de sécurité sociale) du patient recherché, transmis EN ENTIER exactement comme dit — si l'utilisateur donne le prénom ET le nom (ex: \"Malika Cazal\"), transmettre les deux ensemble, jamais seulement le nom de famille.",
        },
      },
      required: ["requete"],
    },
  },
  {
    name: "naviguer",
    description: "Ouvre une page générale du logiciel — pas le dossier d'un patient précis (voir chercher_patient pour ça).",
    input_schema: {
      type: "object",
      properties: {
        destination: {
          type: "string",
          enum: Object.keys(DESTINATIONS_CONNUES),
          description:
            "accueil = hub des modules ; dossiers = recherche/liste des dossiers clients ; produits = catalogue produits ; fournisseurs = liste des fournisseurs ; paiements = recherche par code paiement ; utilisateurs = gestion des comptes.",
        },
      },
      required: ["destination"],
    },
  },
  {
    name: "chercher_produit",
    description:
      "Recherche un produit du catalogue (monture, verre, lentille, appareil auditif...) par marque, modèle ou référence (ex: \"cherche le produit Ray-Ban\", \"ouvre la référence RB1234\").",
    input_schema: {
      type: "object",
      properties: {
        requete: { type: "string", description: "Marque, modèle, référence ou catégorie du produit recherché." },
      },
      required: ["requete"],
    },
  },
  {
    name: "chercher_fournisseur",
    description: "Recherche un fournisseur par nom (ex: \"cherche le fournisseur Essilor\").",
    input_schema: {
      type: "object",
      properties: {
        requete: { type: "string", description: "Nom du fournisseur recherché." },
      },
      required: ["requete"],
    },
  },
  {
    name: "relancer_recherche_mutuelle",
    description:
      "Relance immédiatement la recherche automatique d'un accord/refus de mutuelle par mail pour un patient donné (équivalent du bouton \"Relancer la recherche\" sur son dossier). Ne modifie aucune donnée directement — se contente de vérifier les mails à nouveau tout de suite.",
    input_schema: {
      type: "object",
      properties: {
        patient: { type: "string", description: "Nom et/ou prénom du patient dont il faut relancer la recherche mutuelle." },
      },
      required: ["patient"],
    },
  },
  {
    name: "repasser_en_attente",
    description:
      "Remet en attente une demande de prise en charge mutuelle actuellement refusée pour un patient (équivalent du bouton \"Repasser en attente\"). Modifie une donnée — nécessite une confirmation avant d'être réellement appliquée.",
    input_schema: {
      type: "object",
      properties: {
        patient: { type: "string", description: "Nom et/ou prénom du patient dont la demande refusée doit repasser en attente." },
      },
      required: ["patient"],
    },
  },
  {
    name: "ouvrir_document",
    description:
      "Ouvre un devis, une facture, une ordonnance ou tout autre document (le plus récent) d'un patient (ex: \"ouvre le devis de Malika Cazal\", \"ouvre la dernière facture de Dupont\", \"montre-moi l'ordonnance de Medy\").",
    input_schema: {
      type: "object",
      properties: {
        patient: { type: "string", description: "Nom et/ou prénom du patient, transmis en entier." },
        typeDocument: {
          type: "string",
          enum: ["devis", "facture", "ordonnance", "document"],
          description:
            "devis = proposition/devis ; facture = facture de vente ; ordonnance = ordonnance optique/auditive ; document = tout autre document (carte mutuelle, justificatif...).",
        },
      },
      required: ["patient", "typeDocument"],
    },
  },
  {
    name: "creer_dossier",
    description:
      "Ouvre le formulaire de création d'un nouveau dossier patient, avec le prénom et le nom déjà pré-remplis (ex: \"crée un dossier pour Malika Cazal\", \"nouveau dossier au nom de Dupont\"). Ne crée rien tout seul : le formulaire reste à valider par l'utilisateur (téléphone ou email obligatoire, à saisir à la main).",
    input_schema: {
      type: "object",
      properties: {
        prenom: { type: "string", description: "Prénom du nouveau patient." },
        nom: { type: "string", description: "Nom du nouveau patient." },
      },
      required: ["nom"],
    },
  },
  {
    name: "modifier_dossier",
    description:
      "Corrige le nom, le prénom, le téléphone, l'email ou l'adresse d'un patient (ex: \"change le téléphone de Malika Cazal en 06...\", \"corrige le prénom de Dupont en Jean\", \"modifie l'adresse de X\"). Modifie une donnée — nécessite une confirmation avant d'être réellement appliqué. Pour tout le reste (montant d'une facture, statut d'un dossier...), ce n'est pas cet outil — ne pas l'utiliser.",
    input_schema: {
      type: "object",
      properties: {
        patient: { type: "string", description: "Nom et/ou prénom du patient concerné (tel qu'il est déjà connu — pas la nouvelle valeur si on renomme)." },
        champ: {
          type: "string",
          enum: ["nom", "prenom", "telephone", "email", "adresse", "adresseLigne2", "codePostal", "ville"],
          description: "adresse = ligne 1 ; adresseLigne2 = complément (bâtiment, étage...).",
        },
        valeur: { type: "string", description: "La nouvelle valeur, telle que dite." },
      },
      required: ["patient", "champ", "valeur"],
    },
  },
  {
    name: "appliquer_remise_devis",
    description:
      "Applique une remise en pourcentage sur le devis en brouillon d'un patient — sur tout le devis, ou sur un seul produit si précisé (ex: \"mets 20% de remise sur le devis de Malika Cazal\", \"une remise de 50% sur la monture de Dupont\"). Uniquement les paliers 10, 20, 30, 50 ou 100%. Modifie une donnée — nécessite une confirmation avant d'être réellement appliqué. Ne fonctionne que sur un devis encore en brouillon (pas déjà envoyé/accepté).",
    input_schema: {
      type: "object",
      properties: {
        patient: { type: "string", description: "Nom et/ou prénom du patient concerné." },
        pourcentage: { type: "number", enum: [10, 20, 30, 50, 100], description: "Le palier de remise à appliquer." },
        produit: {
          type: "string",
          description: "Optionnel — nom du produit ciblé (monture, verre...) si la remise ne doit s'appliquer qu'à une ligne du devis, pas à tout le devis.",
        },
      },
      required: ["patient", "pourcentage"],
    },
  },
];

const PROMPT_SYSTEME = `Tu es l'assistant vocal du logiciel de gestion d'un magasin d'optique/audition (SAS Optique & Audition). On te donne le texte transcrit d'une phrase que l'utilisateur a dite au micro, en français — parfois imparfaitement reconnu.

Choisis l'outil le plus approprié à sa demande et appelle-le avec les bons arguments. Si sa demande ne correspond à aucune action disponible pour l'instant (valider un accord, enregistrer un paiement, modifier le montant d'une facture, "fermer" un dossier — un dossier client n'a volontairement pas de statut ouvert/fermé dans ce logiciel, etc. — pas encore supporté à la voix), réponds par une phrase courte expliquant que cette action n'est pas encore possible à la voix, sans appeler d'outil.`;

export type ResultatAssistantVocal =
  | { type: "navigation"; url: string; libelle: string }
  | { type: "document_popup"; url: string; titre: string }
  | { type: "resultats_patients"; personnes: { id: string; nom: string; prenom: string | null }[] }
  | { type: "confirmation"; description: string; action: string; parametres: Record<string, unknown> }
  | { type: "message"; texte: string };

/** Les seules actions qui modifient des données — jamais exécutées directement par interpreterCommandeVocale, uniquement via executerActionConfirmee après un accord explicite de l'utilisateur. */
const ACTIONS_CONFIRMABLES = ["repasser_en_attente", "modifier_dossier", "appliquer_remise_devis"] as const;
type ActionConfirmable = (typeof ACTIONS_CONFIRMABLES)[number];

/** Même liste que CHAMPS_MODIFIABLES dans /api/dossiers/[id]/route.ts, restreinte aux champs simples qu'il est raisonnable de dicter (pas civilité, NSS, préférences de contact...). */
const CHAMPS_DOSSIER_MODIFIABLES = ["nom", "prenom", "telephone", "email", "adresse", "adresseLigne2", "codePostal", "ville"] as const;
type ChampDossierModifiable = (typeof CHAMPS_DOSSIER_MODIFIABLES)[number];

function estChampDossierModifiable(champ: string): champ is ChampDossierModifiable {
  return (CHAMPS_DOSSIER_MODIFIABLES as readonly string[]).includes(champ);
}

function estActionConfirmable(action: string): action is ActionConfirmable {
  return (ACTIONS_CONFIRMABLES as readonly string[]).includes(action);
}

/**
 * Variantes phonétiques d'un mot pour compenser les erreurs de transcription
 * vocale — constaté en conditions réelles : la reconnaissance vocale du
 * navigateur confond régulièrement "s" et "z" en français ("Cazal" transcrit
 * "Casal"), ce qui fait échouer toute recherche par préfixe/contenu exacte
 * même quand le nom est correctement prononcé. On recherche donc aussi le
 * mot avec ses "s"/"z" permutés, en plus de l'original.
 */
function variantesPhonetiques(mot: string): string[] {
  const variantes = new Set([mot]);
  variantes.add(mot.replace(/z/gi, "s"));
  variantes.add(mot.replace(/s/gi, "z"));
  // "y"/"i" se prononcent pareil en français ("Medy" transcrit "Medi").
  variantes.add(mot.replace(/y/gi, "i"));
  variantes.add(mot.replace(/i/gi, "y"));
  return [...variantes];
}

/**
 * Mots de liaison/politesse fréquents dans une phrase dite au micro
 * ("Malika Cazal s'il te plaît", "trouve-moi Dupont merci") — à exclure de
 * la recherche mot-par-mot ci-dessous : sinon la condition "tous les mots
 * doivent matcher nom OU prénom" échoue dès qu'un seul mot de politesse
 * traîne après le nom, alors que le nom lui-même est correct.
 */
const MOTS_VIDES = new Set([
  "le", "la", "les", "l", "de", "du", "des", "d", "au", "aux", "nom",
  "s'il", "sil", "vous", "te", "plait", "plaît", "merci", "voila", "voilà",
  "stp", "svp", "donc", "alors", "euh", "hein", "dossier", "dossiers",
]);

function motsPertinents(requete: string): string[] {
  return requete
    .split(/\s+/)
    .map((m) => m.replace(/[.,!?;:]+$/, ""))
    .filter((m) => m.length >= 2 && !MOTS_VIDES.has(m.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()));
}

/**
 * Recherche un patient dont la reconnaissance vocale a collé le prénom et le
 * nom en un seul mot sans espace (constaté en conditions réelles : "Medy
 * Cazal" transcrit "Medicasal") — essaie toutes les coupures possibles du
 * mot et vérifie chaque moitié contre nom/prénom (dans les deux ordres, avec
 * variantes phonétiques).
 */
async function chercherMotAccole(mot: string): Promise<{ id: string; nom: string; prenom: string | null }[]> {
  if (mot.length < 4) return [];
  const combinaisons: Array<{ AND: [{ OR: object[] }, { OR: object[] }] }> = [];
  for (let i = 2; i <= mot.length - 2; i++) {
    const gauche = variantesPhonetiques(mot.slice(0, i));
    const droite = variantesPhonetiques(mot.slice(i));
    combinaisons.push({
      AND: [
        { OR: gauche.map((v) => ({ prenom: { startsWith: v, mode: "insensitive" as const } })) },
        { OR: droite.map((v) => ({ nom: { startsWith: v, mode: "insensitive" as const } })) },
      ],
    });
    combinaisons.push({
      AND: [
        { OR: gauche.map((v) => ({ nom: { startsWith: v, mode: "insensitive" as const } })) },
        { OR: droite.map((v) => ({ prenom: { startsWith: v, mode: "insensitive" as const } })) },
      ],
    });
  }
  return prisma.personne.findMany({
    where: { OR: combinaisons },
    orderBy: { nom: "asc" },
    take: 5,
    select: { id: true, nom: true, prenom: true },
  });
}

async function rechercherPersonnes(requeteBrute: string): Promise<{ id: string; nom: string; prenom: string | null }[]> {
  const requete = requeteBrute.trim();
  if (!requete) return [];

  const mots = motsPertinents(requete);
  if (mots.length === 0) return [];

  // Un seul mot significatif après avoir écarté les mots de liaison/politesse
  // ("Cazal", ou "Cazal s'il te plaît") : recherche par préfixe (rapide), en
  // tentant aussi les variantes phonétiques et le numéro de sécu.
  if (mots.length === 1) {
    const parPrefixe = await prisma.personne.findMany({
      where: {
        OR: [
          ...variantesPhonetiques(mots[0]).flatMap((v) => [
            { nom: { startsWith: v, mode: "insensitive" as const } },
            { prenom: { startsWith: v, mode: "insensitive" as const } },
          ]),
          { numeroSecuriteSociale: { startsWith: requete } },
        ],
      },
      orderBy: { nom: "asc" },
      take: 5,
      select: { id: true, nom: true, prenom: true },
    });
    if (parPrefixe.length > 0) return parPrefixe;
    // Rien trouvé : la reconnaissance vocale a pu accoler prénom et nom sans
    // espace ("Medy Cazal" transcrit "Medicasal") — on tente de recoller les
    // morceaux en essayant toutes les coupures possibles du mot.
    return chercherMotAccole(mots[0]);
  }

  // Plusieurs mots significatifs ("Malika Cazal", ordre nom/prénom inconnu,
  // ou reconnaissance vocale ayant inversé les mots) : chaque mot doit se
  // retrouver, indépendamment, dans le nom OU le prénom.
  return prisma.personne.findMany({
    where: {
      AND: mots.map((mot) => ({
        OR: variantesPhonetiques(mot).flatMap((v) => [
          { nom: { contains: v, mode: "insensitive" as const } },
          { prenom: { contains: v, mode: "insensitive" as const } },
        ]),
      })),
    },
    orderBy: { nom: "asc" },
    take: 5,
    select: { id: true, nom: true, prenom: true },
  });
}

async function chercherPatient(requeteBrute: string): Promise<ResultatAssistantVocal> {
  if (!requeteBrute.trim()) {
    return { type: "message", texte: "Je n'ai pas compris le nom du patient à chercher." };
  }
  return { type: "resultats_patients", personnes: await rechercherPersonnes(requeteBrute) };
}

async function chercherProduit(requeteBrute: string): Promise<ResultatAssistantVocal> {
  const requete = requeteBrute.trim();
  if (!requete) {
    return { type: "message", texte: "Je n'ai pas compris quel produit chercher." };
  }
  const produits = await prisma.produit.findMany({
    where: {
      OR: [
        { marque: { contains: requete, mode: "insensitive" } },
        { modele: { contains: requete, mode: "insensitive" } },
        { reference: { contains: requete, mode: "insensitive" } },
        { categorie: { contains: requete, mode: "insensitive" } },
      ],
    },
    take: 5,
    select: { id: true, marque: true, modele: true },
  });
  if (produits.length === 0) {
    return { type: "message", texte: `Aucun produit trouvé pour « ${requete} ».` };
  }
  if (produits.length === 1) {
    return { type: "navigation", url: `/produits/${produits[0].id}`, libelle: `${produits[0].marque} ${produits[0].modele}` };
  }
  return { type: "navigation", url: `/produits?q=${encodeURIComponent(requete)}`, libelle: `résultats pour « ${requete} »` };
}

async function chercherFournisseur(requeteBrute: string): Promise<ResultatAssistantVocal> {
  const requete = requeteBrute.trim();
  if (!requete) {
    return { type: "message", texte: "Je n'ai pas compris quel fournisseur chercher." };
  }
  const fournisseurs = await prisma.fournisseur.findMany({
    where: { nom: { contains: requete, mode: "insensitive" } },
    take: 5,
    select: { nom: true },
  });
  if (fournisseurs.length === 0) {
    return { type: "message", texte: `Aucun fournisseur trouvé pour « ${requete} ».` };
  }
  return { type: "navigation", url: "/fournisseurs", libelle: fournisseurs.map((f) => f.nom).join(", ") };
}

async function relancerRechercheMutuelle(patientBrut: string): Promise<ResultatAssistantVocal> {
  const personnes = await rechercherPersonnes(patientBrut);
  if (personnes.length === 0) {
    return { type: "message", texte: `Aucun patient trouvé pour « ${patientBrut} ».` };
  }
  if (personnes.length > 1) {
    return { type: "resultats_patients", personnes };
  }
  const personne = personnes[0];
  const resultat = await declencherRechercheAccordMutuelle(personne.id);
  if (!resultat.ok) {
    return { type: "message", texte: resultat.erreur };
  }
  const nomComplet = [personne.prenom, personne.nom].filter(Boolean).join(" ");
  return {
    type: "message",
    texte: resultat.declenche
      ? `Recherche relancée pour ${nomComplet}.`
      : `Recherche non déclenchée pour ${nomComplet} — vérifiez les boîtes mail configurées.`,
  };
}

async function demanderConfirmationRepasserEnAttente(patientBrut: string): Promise<ResultatAssistantVocal> {
  const personnes = await rechercherPersonnes(patientBrut);
  if (personnes.length === 0) {
    return { type: "message", texte: `Aucun patient trouvé pour « ${patientBrut} ».` };
  }
  if (personnes.length > 1) {
    return { type: "resultats_patients", personnes };
  }
  const personne = personnes[0];
  const demandesRefusees = await prisma.demandePriseEnCharge.findMany({
    where: { personneId: personne.id, statut: "REFUS" },
  });
  const nomComplet = [personne.prenom, personne.nom].filter(Boolean).join(" ");
  if (demandesRefusees.length === 0) {
    return { type: "message", texte: `${nomComplet} n'a aucune demande refusée à remettre en attente.` };
  }
  if (demandesRefusees.length > 1) {
    return {
      type: "message",
      texte: `${nomComplet} a plusieurs demandes refusées — ouvrez son dossier pour choisir laquelle remettre en attente.`,
    };
  }
  return {
    type: "confirmation",
    description: `Remettre en attente la demande refusée de ${nomComplet} ?`,
    action: "repasser_en_attente",
    parametres: { demandeId: demandesRefusees[0].id },
  };
}

const LIBELLES_TYPE_DOCUMENT: Record<string, string> = {
  devis: "devis",
  facture: "facture",
  ordonnance: "ordonnance",
  document: "document",
};

/**
 * Ouvre directement le document demandé dans une popup d'aperçu (voir
 * AssistantVocal.tsx, type "document_popup") plutôt que de naviguer vers une
 * page — "afficher"/"ouvrir" un devis/une facture/un document doit montrer
 * le document lui-même. Le devis et la facture ont un PDF généré à la volée
 * (déjà servi en "inline", donc directement affichable) ; l'ordonnance et
 * "document" quelconque visent la pièce scannée la plus récente du type
 * demandé (voir Document/TypeDocument), servie en aperçu via
 * /telecharger?apercu=1.
 */
async function ouvrirDocument(patientBrut: string, typeDocument: string): Promise<ResultatAssistantVocal> {
  const personnes = await rechercherPersonnes(patientBrut);
  if (personnes.length === 0) {
    return { type: "message", texte: `Aucun patient trouvé pour « ${patientBrut} ».` };
  }
  if (personnes.length > 1) {
    return { type: "resultats_patients", personnes };
  }
  const personne = personnes[0];
  const nomComplet = [personne.prenom, personne.nom].filter(Boolean).join(" ");
  const libelle = LIBELLES_TYPE_DOCUMENT[typeDocument] ?? "document";

  if (typeDocument === "devis") {
    const derniereProposition = await prisma.proposition.findFirst({
      where: { personneId: personne.id },
      orderBy: { creeA: "desc" },
    });
    if (!derniereProposition) {
      return { type: "message", texte: `${nomComplet} n'a aucun devis.` };
    }
    return { type: "document_popup", url: `/api/propositions/${derniereProposition.id}/formulaire`, titre: "Devis" };
  }

  if (typeDocument === "facture") {
    const derniereFacture = await prisma.facture.findFirst({
      where: { personneId: personne.id },
      orderBy: { creeA: "desc" },
    });
    if (!derniereFacture) {
      return { type: "message", texte: `${nomComplet} n'a aucune facture.` };
    }
    return { type: "document_popup", url: `/api/factures/${derniereFacture.id}/formulaire`, titre: "Facture" };
  }

  // Ordonnance ou document quelconque : pièce scannée la plus récente (voir
  // Document/TypeDocument) — "ordonnance" cible spécifiquement ce type,
  // "document" prend la plus récente quel que soit son type.
  const document = await prisma.document.findFirst({
    where: { personneId: personne.id, ...(typeDocument === "ordonnance" ? { type: "ORDONNANCE" } : {}) },
    orderBy: { creeA: "desc" },
  });
  if (!document) {
    return { type: "message", texte: `${nomComplet} n'a aucun${typeDocument === "ordonnance" ? "e ordonnance" : " document"} numérisé.` };
  }
  return {
    type: "document_popup",
    url: `/api/dossiers/${personne.id}/documents/${document.id}/telecharger?apercu=1`,
    titre: libelle.charAt(0).toUpperCase() + libelle.slice(1),
  };
}

/**
 * Ne crée rien en base : ouvre uniquement le formulaire existant avec
 * prénom/nom pré-remplis. Téléphone ou email est obligatoire pour créer un
 * dossier (voir /api/dossiers) et trop peu fiable à dicter pour être rempli
 * à la voix — l'utilisateur les saisit lui-même, le reste (le nom) est déjà
 * fait.
 */
function creerDossier(prenom: string, nom: string): ResultatAssistantVocal {
  if (!nom.trim()) {
    return { type: "message", texte: "Je n'ai pas compris le nom du nouveau patient." };
  }
  const params = new URLSearchParams();
  if (prenom.trim()) params.set("prenom", prenom.trim());
  params.set("nom", nom.trim());
  return {
    type: "navigation",
    url: `/dossiers/nouveau?${params.toString()}`,
    libelle: `nouveau dossier pour ${[prenom, nom].filter(Boolean).join(" ")}`,
  };
}

async function demanderConfirmationModifierDossier(
  patientBrut: string,
  champ: string,
  valeur: string,
): Promise<ResultatAssistantVocal> {
  if (!estChampDossierModifiable(champ)) {
    return { type: "message", texte: "Ce champ n'est pas modifiable à la voix." };
  }
  if (!valeur.trim()) {
    return { type: "message", texte: "Je n'ai pas compris la nouvelle valeur." };
  }
  const personnes = await rechercherPersonnes(patientBrut);
  if (personnes.length === 0) {
    return { type: "message", texte: `Aucun patient trouvé pour « ${patientBrut} ».` };
  }
  if (personnes.length > 1) {
    return { type: "resultats_patients", personnes };
  }
  const personne = personnes[0];
  const nomComplet = [personne.prenom, personne.nom].filter(Boolean).join(" ");
  const libellesChamp: Record<ChampDossierModifiable, string> = {
    nom: "le nom",
    prenom: "le prénom",
    telephone: "le téléphone",
    email: "l'email",
    adresse: "l'adresse",
    adresseLigne2: "le complément d'adresse",
    codePostal: "le code postal",
    ville: "la ville",
  };
  return {
    type: "confirmation",
    description: `Modifier ${libellesChamp[champ]} de ${nomComplet} en « ${valeur.trim()} » ?`,
    action: "modifier_dossier",
    parametres: { personneId: personne.id, champ, valeur: valeur.trim() },
  };
}

async function demanderConfirmationRemiseDevis(
  patientBrut: string,
  pourcentage: number,
  produitBrut?: string,
): Promise<ResultatAssistantVocal> {
  if (!estRemiseAutorisee(pourcentage)) {
    return { type: "message", texte: `La remise doit être l'un de ces paliers : ${REMISES_AUTORISEES.join(", ")} %.` };
  }
  const personnes = await rechercherPersonnes(patientBrut);
  if (personnes.length === 0) {
    return { type: "message", texte: `Aucun patient trouvé pour « ${patientBrut} ».` };
  }
  if (personnes.length > 1) {
    return { type: "resultats_patients", personnes };
  }
  const personne = personnes[0];
  const nomComplet = [personne.prenom, personne.nom].filter(Boolean).join(" ");

  const proposition = await prisma.proposition.findFirst({
    where: { personneId: personne.id, statut: "BROUILLON" },
    orderBy: { creeA: "desc" },
    include: { lignes: true },
  });
  if (!proposition) {
    return { type: "message", texte: `${nomComplet} n'a aucun devis en brouillon — seul un devis pas encore envoyé peut recevoir une remise.` };
  }
  if (proposition.lignes.length === 0) {
    return { type: "message", texte: `Le devis en brouillon de ${nomComplet} n'a aucune ligne.` };
  }

  let lignesCiblees = proposition.lignes;
  const produit = produitBrut?.trim();
  if (produit) {
    const correspondantes = proposition.lignes.filter((l) => l.libelleProduit.toLowerCase().includes(produit.toLowerCase()));
    if (correspondantes.length === 0) {
      return { type: "message", texte: `Aucun produit correspondant à « ${produit} » dans le devis de ${nomComplet}.` };
    }
    if (correspondantes.length > 1) {
      return {
        type: "message",
        texte: `Plusieurs produits du devis de ${nomComplet} correspondent à « ${produit} » — ouvrez son devis pour préciser lequel.`,
      };
    }
    lignesCiblees = correspondantes;
  }

  const cible = produit ? `« ${lignesCiblees[0].libelleProduit} »` : "tout le devis";
  return {
    type: "confirmation",
    description: `Appliquer ${pourcentage} % de remise sur ${cible} (${nomComplet}) ?`,
    action: "appliquer_remise_devis",
    parametres: { propositionId: proposition.id, ligneIds: lignesCiblees.map((l) => l.id), pourcentage },
  };
}

/**
 * Reconnaît directement, sans passer par l'IA, le tournure la plus fréquente
 * ("ouvre le dossier de Malika Cazal") — constaté en production : avec de
 * plus en plus d'outils disponibles (chercher_produit, relancer_recherche_mutuelle...),
 * le modèle hésite parfois entre `naviguer` (destination "dossiers", à cause
 * du mot "dossier" dans la phrase) et `chercher_patient`, ce qui rendait
 * cette formulation pourtant la plus courante peu fiable. Ce raccourci
 * déterministe la sécurise indépendamment du choix de l'IA — sans rien
 * retirer : les formulations qui ne matchent pas ce motif (ex. "dossiers au
 * nom de Cazal") continuent de passer par l'IA comme avant.
 */
const MOTIF_DOSSIER_DE = /\bdossiers?\s+d['e]\s*(.+)/i;

/**
 * Même principe pour "cherche X" / "trouve(-moi) X" (sans le mot "dossier") :
 * constaté en production, quand X contient prénom ET nom ("cherche Malika
 * Cazal"), l'IA a tendance à ne transmettre que le nom de famille à l'outil
 * chercher_patient au lieu de la requête complète — recherche alors trop
 * étroite (elle listait tous les Cazal au lieu d'ouvrir directement le bon
 * dossier). On exclut les formulations qui visent clairement un autre outil
 * (produit, fournisseur) pour ne pas leur voler la main.
 */
const MOTIF_CHERCHE_PATIENT = /^(?:cherche|trouve)(?:z|-moi)?\s+(?!.*\b(?:produit|référence|fournisseur|marque|modèle)\b)(.+)/i;

/**
 * Variante de MOTIF_DOSSIER_DE pour "dossier NOM" dit sans article ("ouvre
 * dossier Medicasal") — constaté en production, la reconnaissance vocale
 * avale parfois le "de"/"d'" attendu. Le lookahead négatif exclut le mot
 * suivant quand c'est un article/liaison ("dossiers au nom de Cazal" doit
 * continuer à passer par l'IA comme avant, MOTIF_DOSSIER_DE ne matchant pas
 * cette formulation-là non plus).
 */
const MOTIF_DOSSIER_DIRECT = /\bdossiers?\s+(?!(?:au|du|de|des|d['’]|le|la|les|nom)\b)(.+)/i;

/**
 * Reconstitue un nom épelé lettre par lettre ("cherche C A Z A L", ou avec
 * des points "C. A. Z. A. L.") en un seul mot ("CAZAL") — la reconnaissance
 * vocale du navigateur n'a pas de mode dictée-lettres et retranscrit chaque
 * lettre comme un mot séparé. Ne recolle qu'à partir de 3 lettres isolées
 * consécutives, pour ne jamais toucher aux mots français à une lettre ("y",
 * "a") qui apparaissent normalement seuls ou par deux ("il y a").
 */
function reconstruireLettresEpelees(texte: string): string {
  const mots = texte.split(/\s+/);
  const resultat: string[] = [];
  let i = 0;
  while (i < mots.length) {
    let j = i;
    let lettres = "";
    while (j < mots.length) {
      const nettoye = mots[j].replace(/[.,;:!?-]+$/, "");
      if (nettoye.length === 1 && /[a-zà-öø-ÿ]/i.test(nettoye)) {
        lettres += nettoye;
        j++;
      } else {
        break;
      }
    }
    if (lettres.length >= 3) {
      resultat.push(lettres.toUpperCase());
      i = j;
    } else {
      resultat.push(mots[i]);
      i++;
    }
  }
  return resultat.join(" ");
}

export async function interpreterCommandeVocale(texteBrut: string): Promise<ResultatAssistantVocal> {
  const texte = reconstruireLettresEpelees(texteBrut);
  const motifDossier = texte.match(MOTIF_DOSSIER_DE) ?? texte.match(MOTIF_DOSSIER_DIRECT);
  if (motifDossier) {
    return chercherPatient(motifDossier[1]);
  }
  const motifCherche = texte.match(MOTIF_CHERCHE_PATIENT);
  if (motifCherche) {
    return chercherPatient(motifCherche[1]);
  }

  const cleApi = process.env.ANTHROPIC_API_KEY;
  if (!cleApi) {
    return { type: "message", texte: "Assistant vocal indisponible : ANTHROPIC_API_KEY n'est pas configurée sur le serveur." };
  }
  const client = creerClientAnthropic(cleApi);

  const reponse = await client.messages.create({
    model: MODELE,
    max_tokens: 512,
    system: PROMPT_SYSTEME,
    tools: OUTILS,
    messages: [{ role: "user", content: texte }],
  });

  const blocOutil = reponse.content.find((bloc) => bloc.type === "tool_use");
  if (!blocOutil || blocOutil.type !== "tool_use") {
    const blocTexte = reponse.content.find((bloc) => bloc.type === "text");
    return {
      type: "message",
      texte: blocTexte && blocTexte.type === "text" ? blocTexte.text : "Je n'ai pas compris cette commande.",
    };
  }

  switch (blocOutil.name) {
    case "naviguer": {
      const destination = (blocOutil.input as { destination?: string }).destination ?? "";
      const url = DESTINATIONS_CONNUES[destination];
      return url ? { type: "navigation", url, libelle: destination } : { type: "message", texte: "Destination non reconnue." };
    }
    case "chercher_patient":
      return chercherPatient((blocOutil.input as { requete?: string }).requete ?? "");
    case "chercher_produit":
      return chercherProduit((blocOutil.input as { requete?: string }).requete ?? "");
    case "chercher_fournisseur":
      return chercherFournisseur((blocOutil.input as { requete?: string }).requete ?? "");
    case "relancer_recherche_mutuelle":
      return relancerRechercheMutuelle((blocOutil.input as { patient?: string }).patient ?? "");
    case "repasser_en_attente":
      return demanderConfirmationRepasserEnAttente((blocOutil.input as { patient?: string }).patient ?? "");
    case "ouvrir_document": {
      const entree = blocOutil.input as { patient?: string; typeDocument?: string };
      return ouvrirDocument(entree.patient ?? "", entree.typeDocument ?? "document");
    }
    case "creer_dossier": {
      const entree = blocOutil.input as { prenom?: string; nom?: string };
      return creerDossier(entree.prenom ?? "", entree.nom ?? "");
    }
    case "modifier_dossier": {
      const entree = blocOutil.input as { patient?: string; champ?: string; valeur?: string };
      return demanderConfirmationModifierDossier(entree.patient ?? "", entree.champ ?? "", entree.valeur ?? "");
    }
    case "appliquer_remise_devis": {
      const entree = blocOutil.input as { patient?: string; pourcentage?: number; produit?: string };
      if (!entree.patient || typeof entree.pourcentage !== "number") {
        return { type: "message", texte: "Je n'ai pas compris le patient ou le pourcentage de remise." };
      }
      return demanderConfirmationRemiseDevis(entree.patient, entree.pourcentage, entree.produit);
    }
    default:
      return { type: "message", texte: "Commande non reconnue." };
  }
}

/**
 * Exécute réellement une action confirmable — jamais appelée directement
 * depuis interpreterCommandeVocale, uniquement après que l'utilisateur a
 * explicitement validé la confirmation renvoyée (voir components/AssistantVocal.tsx
 * et /api/assistant-vocal/executer). Revalide tout côté serveur (le client
 * ne fait que renvoyer ce que le serveur lui a lui-même proposé, mais on ne
 * lui fait pas confiance pour autant).
 */
export async function executerActionConfirmee(action: string, parametres: unknown, acteur?: string): Promise<ResultatAssistantVocal> {
  if (!estActionConfirmable(action)) {
    return { type: "message", texte: "Action non reconnue ou non confirmable." };
  }
  if (action === "repasser_en_attente") {
    const demandeId = (parametres as { demandeId?: string } | null)?.demandeId;
    if (typeof demandeId !== "string" || !demandeId) {
      return { type: "message", texte: "Paramètres invalides." };
    }
    const resultat = await repasserDemandeEnAttente(demandeId, acteur);
    if (!resultat.ok) {
      return { type: "message", texte: resultat.erreur };
    }
    return { type: "message", texte: "Demande remise en attente." };
  }
  if (action === "modifier_dossier") {
    const params = parametres as { personneId?: string; champ?: string; valeur?: string } | null;
    const personneId = params?.personneId;
    const champ = params?.champ;
    const valeur = params?.valeur;
    if (typeof personneId !== "string" || !personneId || !champ || !estChampDossierModifiable(champ) || typeof valeur !== "string" || !valeur) {
      return { type: "message", texte: "Paramètres invalides." };
    }
    const personne = await prisma.personne.update({ where: { id: personneId }, data: { [champ]: valeur } });
    await journaliser({
      type: "personne.modifiee",
      entite: "Personne",
      entiteId: personneId,
      personneId,
      acteur,
      donnees: { [champ]: valeur },
    });
    const nomComplet = [personne.prenom, personne.nom].filter(Boolean).join(" ");
    return { type: "message", texte: `Contact mis à jour pour ${nomComplet}.` };
  }
  if (action === "appliquer_remise_devis") {
    const params = parametres as { propositionId?: string; ligneIds?: string[]; pourcentage?: number } | null;
    const propositionId = params?.propositionId;
    const ligneIds = params?.ligneIds;
    const pourcentage = params?.pourcentage;
    if (
      typeof propositionId !== "string" ||
      !propositionId ||
      !Array.isArray(ligneIds) ||
      ligneIds.length === 0 ||
      typeof pourcentage !== "number" ||
      !estRemiseAutorisee(pourcentage)
    ) {
      return { type: "message", texte: "Paramètres invalides." };
    }
    const proposition = await prisma.proposition.findUnique({ where: { id: propositionId } });
    if (!proposition) {
      return { type: "message", texte: "Devis introuvable." };
    }
    if (proposition.statut !== "BROUILLON") {
      return { type: "message", texte: "Ce devis n'est plus en brouillon — la remise ne peut plus être modifiée à la voix." };
    }
    await prisma.propositionLigne.updateMany({
      where: { id: { in: ligneIds }, propositionId },
      data: { remisePourcent: pourcentage },
    });
    await journaliser({
      type: "proposition.ligne_correction_modifiee",
      entite: "Proposition",
      entiteId: propositionId,
      personneId: proposition.personneId,
      acteur,
      donnees: { remisePourcent: pourcentage, ligneIds },
    });
    return { type: "message", texte: `Remise de ${pourcentage} % appliquée.` };
  }
  return { type: "message", texte: "Action non reconnue." };
}
