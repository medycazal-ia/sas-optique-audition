import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { creerClientAnthropic } from "@/lib/anthropicClient";
import { declencherRechercheAccordMutuelle } from "@/lib/rechercheAccordMutuelle";
import { repasserDemandeEnAttente } from "@/lib/repasserEnAttente";

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
      "Recherche un patient par nom, prénom ou numéro de sécurité sociale pour ouvrir son dossier. À utiliser dès que l'utilisateur nomme une personne (ex: \"ouvre le dossier de Malika Cazal\", \"cherche Dupont\", \"trouve-moi le dossier de Medy\").",
    input_schema: {
      type: "object",
      properties: {
        requete: { type: "string", description: "Nom, prénom, ou numéro de sécurité sociale du patient recherché." },
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
];

const PROMPT_SYSTEME = `Tu es l'assistant vocal du logiciel de gestion d'un magasin d'optique/audition (SAS Optique & Audition). On te donne le texte transcrit d'une phrase que l'utilisateur a dite au micro, en français — parfois imparfaitement reconnu.

Choisis l'outil le plus approprié à sa demande et appelle-le avec les bons arguments. Si sa demande ne correspond à aucune action disponible pour l'instant (créer un devis, valider un accord, enregistrer un paiement, créer un nouveau dossier, etc. — pas encore supporté à la voix), réponds par une phrase courte expliquant que cette action n'est pas encore possible à la voix, sans appeler d'outil.`;

export type ResultatAssistantVocal =
  | { type: "navigation"; url: string; libelle: string }
  | { type: "resultats_patients"; personnes: { id: string; nom: string; prenom: string | null }[] }
  | { type: "confirmation"; description: string; action: string; parametres: Record<string, unknown> }
  | { type: "message"; texte: string };

/** Les seules actions qui modifient des données — jamais exécutées directement par interpreterCommandeVocale, uniquement via executerActionConfirmee après un accord explicite de l'utilisateur. */
const ACTIONS_CONFIRMABLES = ["repasser_en_attente"] as const;
type ActionConfirmable = (typeof ACTIONS_CONFIRMABLES)[number];

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
  return [...variantes];
}

async function rechercherPersonnes(requeteBrute: string): Promise<{ id: string; nom: string; prenom: string | null }[]> {
  const requete = requeteBrute.trim();
  if (!requete) return [];

  const variantesRequete = variantesPhonetiques(requete);

  const parPrefixe = await prisma.personne.findMany({
    where: {
      OR: [
        ...variantesRequete.flatMap((v) => [
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

  // Requête à deux mots ("Malika Cazal") non trouvée en préfixe simple (ordre
  // nom/prénom inconnu, ou reconnaissance vocale ayant inversé les mots) :
  // on cherche chaque mot indépendamment dans nom OU prénom.
  const mots = requete.split(/\s+/).filter((m) => m.length >= 2);
  if (mots.length >= 2) {
    const parMots = await prisma.personne.findMany({
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
    if (parMots.length > 0) return parMots;
  }

  return [];
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

export async function interpreterCommandeVocale(texte: string): Promise<ResultatAssistantVocal> {
  const motifDossier = texte.match(MOTIF_DOSSIER_DE);
  if (motifDossier) {
    return chercherPatient(motifDossier[1]);
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
  return { type: "message", texte: "Action non reconnue." };
}
