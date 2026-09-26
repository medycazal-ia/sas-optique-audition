import { Resend } from "resend";

/**
 * Envoi d'un document du dossier (pièce jointe) par email — voir carte
 * "Client"/"Santé" > Documents (historique). Même garde-fou que
 * lib/emailTiersPayant.ts : RESEND_FROM doit être une adresse de domaine
 * vérifié sur resend.com pour pouvoir écrire à un tiers (la valeur de test
 * par défaut ne peut écrire qu'au compte Resend lui-même).
 */

const EXPEDITEUR_PAR_DEFAUT = "onboarding@resend.dev";

export async function envoyerDocumentParEmail(params: {
  destinataire: string;
  sujet: string;
  texte: string;
  nomFichier: string;
  contenu: Buffer;
}): Promise<void> {
  const cleApi = process.env.RESEND_API_KEY;
  if (!cleApi) {
    throw new Error("Envoi par email indisponible : RESEND_API_KEY n'est pas configurée sur le serveur.");
  }

  const client = new Resend(cleApi);
  const { error } = await client.emails.send({
    from: process.env.RESEND_FROM ?? EXPEDITEUR_PAR_DEFAUT,
    to: params.destinataire,
    subject: params.sujet,
    text: params.texte,
    attachments: [{ filename: params.nomFichier, content: params.contenu }],
  });

  if (error) {
    throw new Error(`Échec de l'envoi de l'email : ${error.message}`);
  }
}
