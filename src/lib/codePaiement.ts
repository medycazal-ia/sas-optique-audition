import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * "Code paiement" — identifiant unique attaché à la demande dès qu'un
 * montant de prise en charge est connu (accord mutuelle), imprimé en QR
 * (voir /api/demandes-mutuelle/:id/code-paiement/qrcode). Fonctionne comme
 * un "pseudo tiers payant" : que l'opticien pratique ou non le tiers payant
 * réel avec cette mutuelle, ce code sert de moyen de rapprochement à
 * saisir/scanner quand la somme est effectivement reçue — ou même avant, si
 * une caution client a été prise en attendant son propre remboursement.
 *
 * Deux origines possibles pour ce code, toutes deux acceptées par
 * assurerCodePaiement ci-dessous :
 * - "fictif" (par défaut, tant qu'aucun numéro réel n'est connu) : 128 bits
 *   d'aléa cryptographique (crypto.randomBytes), jamais dérivé d'une donnée
 *   devinable — un jeton purement interne qui valide toujours le
 *   rapprochement, sans référence au monde réel.
 * - "réel" : le numéro d'accord/de prise en charge effectivement délivré
 *   par la mutuelle — extrait par OCR de son courrier de réponse (voir
 *   lib/ocrAccordMutuelle.ts) ou saisi à la main — dès qu'il est connu, à
 *   l'accord ou après coup (voir PATCH /api/demandes-mutuelle/:id/code-paiement).
 *   Le QR encode alors ce numéro réel plutôt qu'un jeton fictif.
 */
export function genererCodePaiement(): string {
  return randomBytes(16).toString("hex");
}

export type ResultatAssurerCodePaiement = {
  code: string;
  /** true si codeSouhaite était fourni mais déjà pris par une autre demande — un jeton fictif a été généré à la place, jamais l'accord lui-même n'est bloqué pour ça. */
  numeroAccordEnConflit: boolean;
};

/**
 * Assure qu'un code paiement existe pour cette demande — idempotent (un
 * accord ne régénère jamais un code déjà émis, pour ne pas invalider un QR
 * déjà imprimé/envoyé). `codeSouhaite`, s'il est fourni ET qu'aucun code
 * n'existe encore, est utilisé tel quel (typiquement le numéro d'accord
 * réel, déjà connu au moment de l'accord). S'il est déjà pris par une autre
 * demande (numéro mal recopié, document dupliqué...), on ne bloque jamais
 * l'accord pour autant : un jeton fictif est généré à la place, et l'appelant
 * est prévenu via `numeroAccordEnConflit` pour pouvoir le signaler/corriger
 * ensuite (voir PATCH /api/demandes-mutuelle/:id/code-paiement). Même repli
 * en jeton fictif si aucun codeSouhaite n'est fourni, avec quelques essais en
 * cas de collision (probabilité négligeable vu l'espace d'aléa, mais
 * l'unicité reste une contrainte DB, pas seulement statistique).
 */
export async function assurerCodePaiement(demandeId: string, codeSouhaite?: string | null): Promise<ResultatAssurerCodePaiement> {
  const existante = await prisma.demandePriseEnCharge.findUnique({
    where: { id: demandeId },
    select: { codePaiement: true },
  });
  if (existante?.codePaiement) return { code: existante.codePaiement, numeroAccordEnConflit: false };

  let numeroAccordEnConflit = false;
  if (codeSouhaite?.trim()) {
    try {
      await prisma.demandePriseEnCharge.update({ where: { id: demandeId }, data: { codePaiement: codeSouhaite.trim() } });
      return { code: codeSouhaite.trim(), numeroAccordEnConflit: false };
    } catch (erreur: unknown) {
      const collision = erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002";
      if (!collision) throw erreur;
      numeroAccordEnConflit = true;
    }
  }

  for (let tentative = 0; tentative < 5; tentative++) {
    const code = genererCodePaiement();
    try {
      await prisma.demandePriseEnCharge.update({ where: { id: demandeId }, data: { codePaiement: code } });
      return { code, numeroAccordEnConflit };
    } catch (erreur: unknown) {
      const collision = erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002";
      if (!collision) throw erreur;
    }
  }
  throw new Error("Impossible de générer un code paiement unique après plusieurs tentatives.");
}
