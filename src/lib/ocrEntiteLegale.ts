import Anthropic from "@anthropic-ai/sdk";
import { detecterTypeMime, TYPES_NON_SUPPORTES_VISION, nomFormatNonSupporte } from "@/lib/detectionMime";
import { validerSiret } from "@/lib/entiteLegale";

/**
 * Extraction des mentions légales d'une entité (société ou magasin) depuis
 * n'importe quel document où elles apparaissent — facture, devis, papier
 * en-tête... — par IA de vision (Claude), pour amorcer la fiche Super Admin
 * sans tout retaper à la main. Comme pour l'ordonnance (lib/ocrOrdonnance.ts),
 * mieux vaut null qu'une valeur devinée : le résultat reste à relire/corriger
 * manuellement avant tout usage réel (les rubriques restent modifiables).
 */

const MODELE = process.env.ANTHROPIC_MODELE_OCR ?? "claude-sonnet-5";

export type ResultatExtractionEntite = {
  raisonSociale: string | null;
  formeJuridique: string | null;
  siret: string | null;
  numeroTvaIntracommunautaire: string | null;
  rcs: string | null;
  capitalSocial: string | null;
  codeApe: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  siteWeb: string | null;
};

const PROMPT = `Tu es un assistant spécialisé dans la lecture des mentions légales d'entreprises françaises figurant sur des documents commerciaux (factures, devis, papier en-tête, etc.). Analyse l'image/le document fourni et extrais UNIQUEMENT les informations suivantes, dans ce format JSON strict, sans aucun texte avant ou après :

{
  "raisonSociale": "dénomination/raison sociale de l'entreprise ou null",
  "formeJuridique": "forme juridique (SARL, SAS, EI, SELARL...) ou null",
  "siret": "numéro SIRET (14 chiffres, sans espace) ou null si absent/illisible",
  "numeroTvaIntracommunautaire": "numéro de TVA intracommunautaire (ex. FR12345678901) ou null",
  "rcs": "mention RCS complète telle qu'écrite (ex. \\"RCS Paris 123 456 789\\") ou null",
  "capitalSocial": "capital social tel qu'écrit (ex. \\"10 000 €\\") ou null",
  "codeApe": "code APE/NAF (ex. \\"47.78C\\") ou null",
  "adresse": "adresse (numéro et rue) du siège ou de l'établissement ou null",
  "codePostal": "code postal ou null",
  "ville": "ville ou null",
  "telephone": "numéro de téléphone ou null",
  "email": "adresse email ou null",
  "siteWeb": "site web ou null"
}

Règles impératives :
- Ces mentions se trouvent généralement en en-tête ou en pied de page du document (bandeau, mentions légales).
- Le SIRET fait exactement 14 chiffres — ne pas le confondre avec un SIREN (9 chiffres) ou un numéro de TVA.
- Si une valeur est illisible, ambiguë, ou absente, réponds null pour ce champ précis plutôt que de deviner.
- N'invente jamais de valeur : mieux vaut null qu'une estimation.
- Réponds TOUJOURS avec exactement ce JSON, quoi qu'il arrive — même si le document est flou, mal cadré, ne comporte aucune mention légale, ou si tu ne peux rien y lire : dans ce cas, mets tous les champs à null. Ne réponds jamais par une phrase, une excuse ou un refus : uniquement le JSON, rien avant, rien après.`;

export async function extraireEntiteLegale(contenu: Buffer, nomFichier: string): Promise<ResultatExtractionEntite> {
  const cleApi = process.env.ANTHROPIC_API_KEY;
  if (!cleApi) {
    throw new Error("Extraction OCR indisponible : ANTHROPIC_API_KEY n'est pas configurée sur le serveur.");
  }

  const client = new Anthropic({ apiKey: cleApi });
  const mediaType = detecterTypeMime(contenu, nomFichier);
  if (TYPES_NON_SUPPORTES_VISION.has(mediaType)) {
    throw new Error(
      `Format de fichier non pris en charge par l'IA de vision (${nomFormatNonSupporte(mediaType)}) — convertissez en PDF/JPEG/PNG ou renseignez les informations à la main.`,
    );
  }
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
    console.error("Extraction entité légale — réponse IA sans JSON exploitable :", texte);
    throw new Error(
      "L'IA de vision n'a pas réussi à lire ce document — vérifiez la qualité/le cadrage et réessayez.",
    );
  }

  const brut = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  const texteOuNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

  return {
    raisonSociale: texteOuNull(brut.raisonSociale),
    formeJuridique: texteOuNull(brut.formeJuridique),
    siret: validerSiret(brut.siret),
    numeroTvaIntracommunautaire: texteOuNull(brut.numeroTvaIntracommunautaire),
    rcs: texteOuNull(brut.rcs),
    capitalSocial: texteOuNull(brut.capitalSocial),
    codeApe: texteOuNull(brut.codeApe),
    adresse: texteOuNull(brut.adresse),
    codePostal: texteOuNull(brut.codePostal),
    ville: texteOuNull(brut.ville),
    telephone: texteOuNull(brut.telephone),
    email: texteOuNull(brut.email),
    siteWeb: texteOuNull(brut.siteWeb),
  };
}
