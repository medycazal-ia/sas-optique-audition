import Anthropic from "@anthropic-ai/sdk";
import { detecterTypeMime } from "@/lib/detectionMime";

/**
 * Extraction des informations d'une carte de mutuelle/tiers payant
 * scannée, par IA de vision (Claude) — même choix et mêmes garanties que
 * pour l'ordonnance (voir lib/ocrOrdonnance.ts) : aucune valeur n'est
 * inventée, tout ce qui est illisible ou absent revient à null plutôt que
 * d'être deviné, sur une donnée qui sert ensuite à une demande de
 * remboursement réelle.
 */

const MODELE = process.env.ANTHROPIC_MODELE_OCR ?? "claude-sonnet-5";

export type ResultatExtractionMutuelle = {
  nomMutuelle: string | null;
  plateforme: string | null;
  numeroAdherent: string | null;
  numeroContrat: string | null;
  numeroSecuriteSociale: string | null;
};

const PROMPT = `Tu es un assistant spécialisé dans la lecture de cartes de mutuelle/tiers payant françaises. Analyse l'image fournie et extrais UNIQUEMENT les informations suivantes, dans ce format JSON strict, sans aucun texte avant ou après :

{
  "nomMutuelle": "nom de la mutuelle/organisme complémentaire ou null",
  "plateforme": "nom de la plateforme de tiers payant imprimée sur la carte (ex: Viamédis, Almerys, iSanté, SP Santé, Carte Blanche...) ou null si absente/illisible",
  "numeroAdherent": "numéro d'adhérent tel qu'imprimé ou null",
  "numeroContrat": "numéro de contrat, s'il est distinct du numéro d'adhérent, ou null",
  "numeroSecuriteSociale": "numéro de sécurité sociale (NIR, 13 ou 15 chiffres) tel qu'imprimé, sans espace, ou null si absent/illisible"
}

Règles impératives :
- Certaines cartes n'ont qu'un seul numéro (adhérent OU contrat) — ne duplique jamais une valeur dans les deux champs si un seul est réellement présent.
- Le NIR (numéro de sécurité sociale) fait 13 chiffres (parfois 15 avec la clé) — ne le confonds pas avec le numéro d'adhérent.
- Si une valeur est illisible, ambiguë, ou absente, réponds null pour ce champ précis plutôt que de deviner.
- N'invente jamais de valeur : mieux vaut null qu'une estimation.
- Réponds TOUJOURS avec exactement ce JSON, quoi qu'il arrive — même si l'image est floue, mal cadrée, pas du tout une carte de mutuelle, ou si tu ne peux rien y lire : dans ce cas, mets tous les champs à null. Ne réponds jamais par une phrase, une excuse ou un refus : uniquement le JSON, rien avant, rien après.`;

export async function extraireMutuelle(contenu: Buffer, nomFichier: string): Promise<ResultatExtractionMutuelle> {
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
    messages: [
      { role: "user", content: [blocContenu, { type: "text", text: PROMPT }] },
      // Voir ocrOrdonnance.ts pour l'explication de ce préremplissage.
      { role: "assistant", content: "{" },
    ],
  });

  const texte = "{" + (reponse.content.find((bloc) => bloc.type === "text")?.text ?? "");
  const jsonMatch = texte.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Extraction mutuelle — réponse IA sans JSON exploitable :", texte);
    throw new Error(
      "L'IA de vision n'a pas réussi à lire ce document — vérifiez la qualité/le cadrage du scan et réessayez.",
    );
  }

  const brut = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  const champTexte = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const nir = typeof brut.numeroSecuriteSociale === "string" ? brut.numeroSecuriteSociale.replace(/\s+/g, "") : "";

  return {
    nomMutuelle: champTexte(brut.nomMutuelle),
    plateforme: champTexte(brut.plateforme),
    numeroAdherent: champTexte(brut.numeroAdherent),
    numeroContrat: champTexte(brut.numeroContrat),
    numeroSecuriteSociale: /^\d{13,15}$/.test(nir) ? nir : null,
  };
}
