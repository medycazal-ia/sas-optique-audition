import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { creerClientAnthropic } from "@/lib/anthropicClient";

/**
 * Assistant vocal — pas de grammaire de commandes figée façon "Hey Google" :
 * le navigateur transcrit la voix en texte libre (voir components/AssistantVocal.tsx),
 * et c'est l'IA qui choisit ici, parmi un ensemble FERMÉ d'actions autorisées
 * (voir OUTILS), laquelle correspond à la demande — jamais une exécution de
 * texte libre ou une URL construite à partir de ce que dit l'IA : chaque
 * outil ne peut produire qu'un résultat prévu à l'avance (une recherche
 * Prisma classique, ou une URL choisie dans DESTINATIONS_CONNUES).
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
];

const PROMPT_SYSTEME = `Tu es l'assistant vocal du logiciel de gestion d'un magasin d'optique/audition (SAS Optique & Audition). On te donne le texte transcrit d'une phrase que l'utilisateur a dite au micro, en français — parfois imparfaitement reconnu.

Choisis l'outil le plus approprié à sa demande et appelle-le avec les bons arguments. Si sa demande ne correspond à aucune action disponible pour l'instant (créer un devis, valider un accord, enregistrer un paiement, etc. — pas encore supporté à la voix), réponds par une phrase courte expliquant que cette action n'est pas encore possible à la voix, sans appeler d'outil.`;

export type ResultatAssistantVocal =
  | { type: "navigation"; url: string; libelle: string }
  | { type: "resultats_patients"; personnes: { id: string; nom: string; prenom: string | null }[] }
  | { type: "message"; texte: string };

async function chercherPatient(requeteBrute: string): Promise<ResultatAssistantVocal> {
  const requete = requeteBrute.trim();
  if (!requete) {
    return { type: "message", texte: "Je n'ai pas compris le nom du patient à chercher." };
  }

  const parPrefixe = await prisma.personne.findMany({
    where: {
      OR: [
        { nom: { startsWith: requete, mode: "insensitive" } },
        { prenom: { startsWith: requete, mode: "insensitive" } },
        { numeroSecuriteSociale: { startsWith: requete } },
      ],
    },
    orderBy: { nom: "asc" },
    take: 5,
    select: { id: true, nom: true, prenom: true },
  });
  if (parPrefixe.length > 0) {
    return { type: "resultats_patients", personnes: parPrefixe };
  }

  // Requête à deux mots ("Malika Cazal") non trouvée en préfixe simple (ordre
  // nom/prénom inconnu, ou reconnaissance vocale ayant inversé les mots) :
  // on cherche chaque mot indépendamment dans nom OU prénom.
  const mots = requete.split(/\s+/).filter((m) => m.length >= 2);
  if (mots.length >= 2) {
    const parMots = await prisma.personne.findMany({
      where: {
        AND: mots.map((mot) => ({
          OR: [{ nom: { contains: mot, mode: "insensitive" } }, { prenom: { contains: mot, mode: "insensitive" } }],
        })),
      },
      orderBy: { nom: "asc" },
      take: 5,
      select: { id: true, nom: true, prenom: true },
    });
    if (parMots.length > 0) {
      return { type: "resultats_patients", personnes: parMots };
    }
  }

  return { type: "resultats_patients", personnes: [] };
}

export async function interpreterCommandeVocale(texte: string): Promise<ResultatAssistantVocal> {
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

  if (blocOutil.name === "naviguer") {
    const destination = (blocOutil.input as { destination?: string }).destination ?? "";
    const url = DESTINATIONS_CONNUES[destination];
    if (!url) {
      return { type: "message", texte: "Destination non reconnue." };
    }
    return { type: "navigation", url, libelle: destination };
  }

  if (blocOutil.name === "chercher_patient") {
    const requete = (blocOutil.input as { requete?: string }).requete ?? "";
    return chercherPatient(requete);
  }

  return { type: "message", texte: "Commande non reconnue." };
}
