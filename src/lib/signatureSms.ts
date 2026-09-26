import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Signature électronique du consentement RGPD par code SMS (Twilio) —
 * alternative à la validation à l'écran, à la signature au stylet, ou au
 * document papier scanné (voir carte RGPD). C'est une signature électronique
 * "simple" au sens eIDAS (un code à usage unique envoyé sur un numéro
 * vérifié vaut preuve d'un acte positif du client) — pas une signature
 * "qualifiée", qui demanderait un prestataire de confiance certifié.
 */

const DUREE_VALIDITE_MINUTES = 10;
const TENTATIVES_MAX = 5;

function hacherCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function genererCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Envoie un nouveau code par SMS — invalide implicitement les codes
 * précédents non utilisés (un seul code actif fait foi à la fois, on ne
 * vérifie que le plus récent).
 */
export async function envoyerCodeSignatureSms(personneId: string, telephone: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const expediteur = process.env.TWILIO_FROM;
  if (!sid || !token || !expediteur) {
    throw new Error("Signature par SMS indisponible : TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM non configurées sur le serveur.");
  }

  const code = genererCode();
  await prisma.codeSignatureSms.create({
    data: {
      personneId,
      codeHash: hacherCode(code),
      expireA: new Date(Date.now() + DUREE_VALIDITE_MINUTES * 60 * 1000),
    },
  });

  const { default: Twilio } = await import("twilio");
  const client = Twilio(sid, token);
  try {
    await client.messages.create({
      to: telephone,
      from: expediteur,
      body: `SAS Optique & Audition — votre code de signature RGPD : ${code} (valable ${DUREE_VALIDITE_MINUTES} min).`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'envoi du SMS.";
    throw new Error(`Échec de l'envoi du code par SMS : ${message}`);
  }
}

export type ResultatVerificationSms = { valide: true } | { valide: false; raison: string };

/** Vérifie le code le plus récent pour cette personne — jamais un code déjà utilisé, expiré, ou après trop d'essais. */
export async function verifierCodeSignatureSms(personneId: string, codeSaisi: string): Promise<ResultatVerificationSms> {
  const dernier = await prisma.codeSignatureSms.findFirst({
    where: { personneId },
    orderBy: { creeA: "desc" },
  });

  if (!dernier) {
    return { valide: false, raison: "Aucun code envoyé — demandez-en un nouveau." };
  }
  if (dernier.utiliseA) {
    return { valide: false, raison: "Ce code a déjà été utilisé — demandez-en un nouveau." };
  }
  if (dernier.expireA < new Date()) {
    return { valide: false, raison: "Code expiré — demandez-en un nouveau." };
  }
  if (dernier.tentatives >= TENTATIVES_MAX) {
    return { valide: false, raison: "Trop de tentatives — demandez un nouveau code." };
  }

  if (hacherCode(codeSaisi.trim()) !== dernier.codeHash) {
    await prisma.codeSignatureSms.update({ where: { id: dernier.id }, data: { tentatives: { increment: 1 } } });
    return { valide: false, raison: "Code incorrect." };
  }

  await prisma.codeSignatureSms.update({ where: { id: dernier.id }, data: { utiliseA: new Date() } });
  return { valide: true };
}
