import Anthropic from "@anthropic-ai/sdk";
import { parserMesureOeil, validerFiness, validerRpps, type MesureOeil } from "@/lib/optique";
import { detecterTypeMime } from "@/lib/detectionMime";

/**
 * Extraction des mesures d'une ordonnance optique scannée, par IA de
 * vision (Claude) — une ordonnance manuscrite n'est pas fiablement lisible
 * par un OCR classique (Tesseract), d'où ce choix. Ne renvoie JAMAIS une
 * valeur hors des bornes plausibles d'une correction humaine (voir
 * BORNES_MESURE) : au-delà, c'est presque sûrement une erreur de lecture,
 * mieux vaut null (à saisir/corriger à la main) qu'une valeur fausse sur
 * une donnée de santé.
 */

const MODELE = process.env.ANTHROPIC_MODELE_OCR ?? "claude-sonnet-5";

export type ResultatExtraction = {
  dateEmission: string | null; // "YYYY-MM-DD"
  emisePar: string | null;
  cabinetNom: string | null;
  finess: string | null;
  rpps: string | null;
  od: MesureOeil;
  og: MesureOeil;
};

const PROMPT = `Tu es un assistant spécialisé dans la lecture d'ordonnances optiques françaises (souvent manuscrites). Analyse l'image fournie et extrais UNIQUEMENT les informations suivantes, dans ce format JSON strict, sans aucun texte avant ou après :

{
  "dateEmission": "YYYY-MM-DD ou null si illisible/absente",
  "emisePar": "nom du praticien prescripteur ou null",
  "cabinetNom": "nom du cabinet/cabinet médical ou null",
  "finess": "numéro FINESS du cabinet (9 chiffres, sans espace) ou null si absent/illisible",
  "rpps": "numéro RPPS du praticien (11 chiffres, sans espace) ou null si absent/illisible",
  "od": { "sphere": nombre ou null, "cylindre": nombre ou null, "axe": entier 0-180 ou null, "addition": nombre ou null },
  "og": { "sphere": nombre ou null, "cylindre": nombre ou null, "axe": entier 0-180 ou null, "addition": nombre ou null }
}

Règles impératives :
- OD = œil droit, OG = œil gauche (attention à ne pas les inverser).
- Les ophtalmologistes français écrivent en cylindre NÉGATIF — reporte le signe exactement tel qu'écrit sur l'ordonnance, ne transpose rien.
- Sphère et cylindre sont en dioptries, par quart de dioptrie (0.25) — ex: +1.25, -0.50.
- "addition" (ADD) n'est présente qu'en cas de vision de près/progressifs — sinon null.
- Le FINESS et le RPPS sont généralement imprimés en petits caractères dans l'en-tête ou le pied de l'ordonnance, près du nom du cabinet/praticien — cherche-les spécifiquement, ne les confonds pas avec un numéro de téléphone, de sécurité sociale ou d'ADELI (ancien identifiant, différent du RPPS).
- Si une valeur est illisible, ambiguë, ou absente, réponds null pour ce champ précis plutôt que de deviner.
- N'invente jamais de valeur : mieux vaut null qu'une estimation.
- Réponds TOUJOURS avec exactement ce JSON, quoi qu'il arrive — même si l'image est floue, mal cadrée, pas du tout une ordonnance, ou si tu ne peux rien y lire : dans ce cas, mets tous les champs à null. Ne réponds jamais par une phrase, une excuse ou un refus : uniquement le JSON, rien avant, rien après.`;

/**
 * `contenu` : le fichier scanné (image ou PDF) tel que stocké.
 * `nomFichier` : le nom d'origine, pour déduire le type MIME.
 * Jette une erreur explicite si ANTHROPIC_API_KEY n'est pas configurée —
 * à l'appelant de la transformer en message utilisateur clair.
 */
export async function extraireMesuresOrdonnance(contenu: Buffer, nomFichier: string): Promise<ResultatExtraction> {
  const cleApi = process.env.ANTHROPIC_API_KEY;
  if (!cleApi) {
    throw new Error(
      "Extraction OCR indisponible : ANTHROPIC_API_KEY n'est pas configurée sur le serveur.",
    );
  }

  const client = new Anthropic({ apiKey: cleApi });
  const mediaType = detecterTypeMime(contenu, nomFichier);
  const donneesBase64 = contenu.toString("base64");

  const blocContenu =
    mediaType === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: mediaType, data: donneesBase64 } } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: donneesBase64,
          },
        } as const);

  const reponse = await client.messages.create({
    model: MODELE,
    max_tokens: 1024,
    messages: [{ role: "user", content: [blocContenu, { type: "text", text: PROMPT }] }],
  });

  const texte = reponse.content.find((bloc) => bloc.type === "text")?.text ?? "";
  const jsonMatch = texte.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Extraction ordonnance — réponse IA sans JSON exploitable :", texte);
    throw new Error(
      "L'IA de vision n'a pas réussi à lire ce document — vérifiez la qualité/le cadrage du scan et réessayez.",
    );
  }

  const brut = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  const dateEmission =
    typeof brut.dateEmission === "string" && /^\d{4}-\d{2}-\d{2}$/.test(brut.dateEmission) ? brut.dateEmission : null;
  const emisePar = typeof brut.emisePar === "string" && brut.emisePar.trim() ? brut.emisePar.trim() : null;
  const cabinetNom = typeof brut.cabinetNom === "string" && brut.cabinetNom.trim() ? brut.cabinetNom.trim() : null;

  return {
    dateEmission,
    emisePar,
    cabinetNom,
    finess: validerFiness(brut.finess),
    rpps: validerRpps(brut.rpps),
    od: parserMesureOeil(brut.od),
    og: parserMesureOeil(brut.og),
  };
}
