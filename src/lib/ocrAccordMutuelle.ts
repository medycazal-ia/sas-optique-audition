import Anthropic from "@anthropic-ai/sdk";
import { detecterTypeMime } from "@/lib/detectionMime";

/**
 * Extraction du numéro d'accord/de prise en charge délivré par une mutuelle,
 * depuis son courrier de réponse — par IA de vision (Claude), même
 * philosophie que lib/ocrEntiteLegale.ts et lib/ocrOrdonnance.ts : mieux
 * vaut null qu'une valeur devinée, le résultat reste à relire/corriger avant
 * tout usage (voir /api/demandes-mutuelle/:id/code-paiement/extraire).
 */

const MODELE = process.env.ANTHROPIC_MODELE_OCR ?? "claude-sonnet-5";

export type ResultatExtractionAccordMutuelle = { numeroAccord: string | null };

const PROMPT = `Tu es un assistant spécialisé dans la lecture des courriers de réponse des mutuelles/complémentaires santé (accord de prise en charge optique ou audioprothèse). Analyse le document fourni et extrais UNIQUEMENT le numéro d'accord/de prise en charge, dans ce format JSON strict, sans aucun texte avant ou après :

{
  "numeroAccord": "numéro d'accord/de prise en charge tel qu'écrit ou null si absent/illisible"
}

Règles impératives :
- Ce numéro (parfois appelé "numéro d'accord", "référence d'accord", "numéro de prise en charge" ou "numéro de dossier") identifie l'accord donné par la mutuelle pour CE dossier précis — jamais un numéro de contrat, d'adhérent, ou de sécurité sociale.
- Si le document ne comporte aucun numéro d'accord clairement identifiable comme tel, réponds null plutôt que de deviner.
- N'invente jamais de valeur : mieux vaut null qu'une estimation.
- Réponds TOUJOURS avec exactement ce JSON, quoi qu'il arrive — même si le document est flou, mal cadré, ou ne comporte aucun numéro d'accord : dans ce cas, mets le champ à null. Ne réponds jamais par une phrase, une excuse ou un refus : uniquement le JSON, rien avant, rien après.`;

export async function extraireAccordMutuelle(contenu: Buffer, nomFichier: string): Promise<ResultatExtractionAccordMutuelle> {
  const cleApi = process.env.ANTHROPIC_API_KEY;
  if (!cleApi) {
    throw new Error("Extraction OCR indisponible : ANTHROPIC_API_KEY n'est pas configurée sur le serveur.");
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
    max_tokens: 512,
    messages: [{ role: "user", content: [blocContenu, { type: "text", text: PROMPT }] }],
  });

  const texte = reponse.content.find((bloc) => bloc.type === "text")?.text ?? "";
  const jsonMatch = texte.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Extraction accord mutuelle — réponse IA sans JSON exploitable :", texte);
    throw new Error(
      "L'IA de vision n'a pas réussi à lire ce document — vérifiez la qualité/le cadrage et réessayez.",
    );
  }

  const brut = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  const numeroAccord = typeof brut.numeroAccord === "string" && brut.numeroAccord.trim() ? brut.numeroAccord.trim() : null;
  return { numeroAccord };
}
