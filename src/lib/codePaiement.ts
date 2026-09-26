import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * "Code paiement" — jeton unique généré dès qu'un montant de prise en
 * charge est connu (accord mutuelle), imprimé en QR (voir
 * /api/demandes-mutuelle/:id/code-paiement/qrcode). Fonctionne comme un
 * "pseudo tiers payant" : que l'opticien pratique ou non le tiers payant
 * réel avec cette mutuelle, ce code sert de moyen de rapprochement à
 * saisir/scanner quand la somme est effectivement reçue — ou même avant, si
 * une caution client a été prise en attendant son propre remboursement.
 *
 * 128 bits d'aléa cryptographique (crypto.randomBytes), jamais dérivé d'une
 * donnée devinable (ni l'id de la demande, ni le montant) : "chiffré" au
 * sens non-devinable/vérifiable, comme un jeton de session — pas un secret
 * réversible, une valeur qu'on ne peut pas reconstituer sans l'avoir reçue.
 */
export function genererCodePaiement(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Génère un code paiement unique pour cette demande si elle n'en a pas déjà
 * un (idempotent — un accord ne régénère jamais un code déjà émis, pour ne
 * pas invalider un QR déjà imprimé/envoyé). Quelques essais en cas de
 * collision (probabilité négligeable vu l'espace d'aléa, mais l'unicité
 * reste une contrainte DB, pas seulement statistique).
 */
export async function assurerCodePaiement(demandeId: string): Promise<string> {
  const existante = await prisma.demandePriseEnCharge.findUnique({
    where: { id: demandeId },
    select: { codePaiement: true },
  });
  if (existante?.codePaiement) return existante.codePaiement;

  for (let tentative = 0; tentative < 5; tentative++) {
    const code = genererCodePaiement();
    try {
      await prisma.demandePriseEnCharge.update({ where: { id: demandeId }, data: { codePaiement: code } });
      return code;
    } catch (erreur: unknown) {
      const collision = erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002";
      if (!collision) throw erreur;
    }
  }
  throw new Error("Impossible de générer un code paiement unique après plusieurs tentatives.");
}
