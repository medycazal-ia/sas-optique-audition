import Anthropic from "@anthropic-ai/sdk";
import { detecterTypeMime } from "@/lib/detectionMime";

/**
 * Extraction des informations d'un courrier de réponse de mutuelle (accord
 * ou refus de prise en charge) — par IA (Claude, vision pour un document,
 * texte pour un corps de mail) — même philosophie que lib/ocrEntiteLegale.ts
 * et lib/ocrOrdonnance.ts : mieux vaut null qu'une valeur devinée.
 *
 * Deux usages :
 * - saisie manuelle assistée (voir /api/demandes-mutuelle/:id/code-paiement/extraire)
 *   — seul `numeroAccord` est utilisé, le reste est ignoré par cet appelant ;
 * - traitement automatique des mails entrants (voir lib/traitementMailAccordMutuelle.ts)
 *   — tous les champs servent à identifier le bon dossier (nom/prénom/NSS) et
 *   à décider si la demande peut être mise à jour automatiquement (statut,
 *   motif de refus, montant pris en charge).
 */

const MODELE = process.env.ANTHROPIC_MODELE_OCR ?? "claude-sonnet-5";

export type ResultatExtractionAccordMutuelle = {
  numeroAccord: string | null;
  /** ACCORD si le courrier annonce une prise en charge, REFUS si un refus/rejet, null si indéterminable. */
  statut: "ACCORD" | "REFUS" | null;
  /** Renseigné seulement si statut === "REFUS". */
  motifRefus: string | null;
  /** En centimes — renseigné seulement si statut === "ACCORD" et le montant est explicitement écrit. */
  montantPriseEnChargeTTC: number | null;
  /** Nom/prénom/NSS du patient concerné, pour identifier le bon dossier — jamais ceux d'un tiers (assuré principal si différent du patient). */
  patientNom: string | null;
  patientPrenom: string | null;
  patientNumeroSecuriteSociale: string | null;
  /** Nom de la mutuelle/complémentaire émettrice, si identifiable. */
  mutuelleNom: string | null;
};

const CHAMPS_JSON = `{
  "numeroAccord": "numéro d'accord/de prise en charge tel qu'écrit ou null si absent/illisible",
  "statut": "ACCORD ou REFUS selon la décision annoncée, ou null si indéterminable",
  "motifRefus": "motif du refus tel qu'écrit, uniquement si statut est REFUS, sinon null",
  "montantPriseEnChargeTTC": "montant pris en charge en euros, nombre décimal (ex. 120.50), uniquement si statut est ACCORD et le montant est explicitement écrit, sinon null",
  "patientNom": "nom de famille du patient concerné ou null",
  "patientPrenom": "prénom du patient concerné ou null",
  "patientNumeroSecuriteSociale": "numéro de sécurité sociale (NIR, 15 chiffres) du patient tel qu'écrit ou null",
  "mutuelleNom": "nom de la mutuelle/complémentaire santé émettrice ou null"
}`;

const REGLES = `Règles impératives :
- "numeroAccord" (parfois appelé "référence d'accord", "numéro de prise en charge" ou "numéro de dossier") identifie l'accord donné par la mutuelle pour CE dossier précis — jamais un numéro de contrat, d'adhérent, ou de sécurité sociale.
- "patientNom"/"patientPrenom"/"patientNumeroSecuriteSociale" désignent le PATIENT bénéficiaire des soins, pas forcément l'assuré principal si le document les distingue.
- Si une valeur est illisible, ambiguë, ou absente, réponds null pour ce champ précis plutôt que de deviner.
- N'invente jamais de valeur : mieux vaut null qu'une estimation.
- Réponds TOUJOURS avec exactement ce JSON, quoi qu'il arrive — même si le texte ne comporte aucune des informations demandées : dans ce cas, mets tous les champs à null. Ne réponds jamais par une phrase, une excuse ou un refus : uniquement le JSON, rien avant, rien après.`;

const PROMPT_DOCUMENT = `Tu es un assistant spécialisé dans la lecture des courriers de réponse des mutuelles/complémentaires santé (accord ou refus de prise en charge optique ou audioprothèse). Analyse le document fourni et extrais UNIQUEMENT les informations suivantes, dans ce format JSON strict, sans aucun texte avant ou après :

${CHAMPS_JSON}

${REGLES}`;

const PROMPT_TEXTE = `Tu es un assistant spécialisé dans la lecture des mails de réponse des mutuelles/complémentaires santé (accord ou refus de prise en charge optique ou audioprothèse). Analyse le texte de mail fourni (objet + corps) et extrais UNIQUEMENT les informations suivantes, dans ce format JSON strict, sans aucun texte avant ou après :

${CHAMPS_JSON}

${REGLES}
- Ce texte est un corps de mail brut — ignore les signatures, mentions légales et citations de mails précédents qui n'apportent pas d'information utile.`;

function parseurResultat(texte: string, contexteErreur: string): ResultatExtractionAccordMutuelle {
  const jsonMatch = texte.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(`${contexteErreur} — réponse IA sans JSON exploitable :`, texte);
    throw new Error("L'IA n'a pas réussi à analyser ce contenu — réessayez ou renseignez les informations à la main.");
  }

  const brut = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  const texteOuNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  const statutBrut = typeof brut.statut === "string" ? brut.statut.trim().toUpperCase() : "";
  const statut = statutBrut === "ACCORD" || statutBrut === "REFUS" ? (statutBrut as "ACCORD" | "REFUS") : null;
  const montantBrut = typeof brut.montantPriseEnChargeTTC === "number" ? brut.montantPriseEnChargeTTC : Number(brut.montantPriseEnChargeTTC);
  const montantPriseEnChargeTTC =
    statut === "ACCORD" && Number.isFinite(montantBrut) && montantBrut >= 0 ? Math.round(montantBrut * 100) : null;

  return {
    numeroAccord: texteOuNull(brut.numeroAccord),
    statut,
    motifRefus: statut === "REFUS" ? texteOuNull(brut.motifRefus) : null,
    montantPriseEnChargeTTC,
    patientNom: texteOuNull(brut.patientNom),
    patientPrenom: texteOuNull(brut.patientPrenom),
    patientNumeroSecuriteSociale: texteOuNull(brut.patientNumeroSecuriteSociale),
    mutuelleNom: texteOuNull(brut.mutuelleNom),
  };
}

function clientAnthropic(): Anthropic {
  const cleApi = process.env.ANTHROPIC_API_KEY;
  if (!cleApi) {
    throw new Error("Extraction OCR indisponible : ANTHROPIC_API_KEY n'est pas configurée sur le serveur.");
  }
  return new Anthropic({ apiKey: cleApi });
}

/** Extraction depuis un document (image ou PDF) — courrier scanné/photographié/téléversé, ou pièce jointe de mail. */
export async function extraireAccordMutuelle(contenu: Buffer, nomFichier: string): Promise<ResultatExtractionAccordMutuelle> {
  const client = clientAnthropic();
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
    messages: [{ role: "user", content: [blocContenu, { type: "text", text: PROMPT_DOCUMENT }] }],
  });

  const texte = reponse.content.find((bloc) => bloc.type === "text")?.text ?? "";
  return parseurResultat(texte, "Extraction accord mutuelle (document)");
}

/** Extraction depuis un texte brut — corps de mail, quand le numéro d'accord n'est pas dans une pièce jointe. */
export async function extraireAccordMutuelleDepuisTexte(sujet: string, corps: string): Promise<ResultatExtractionAccordMutuelle> {
  const client = clientAnthropic();
  const texteAAnalyser = `Objet : ${sujet}\n\n${corps}`.slice(0, 20000);

  const reponse = await client.messages.create({
    model: MODELE,
    max_tokens: 1024,
    messages: [{ role: "user", content: `${PROMPT_TEXTE}\n\n--- Contenu du mail ---\n${texteAAnalyser}` }],
  });

  const texte = reponse.content.find((bloc) => bloc.type === "text")?.text ?? "";
  return parseurResultat(texte, "Extraction accord mutuelle (texte)");
}
