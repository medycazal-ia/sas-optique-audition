import type { Avoir, Facture, Paiement, StatutFacture } from "@prisma/client";

/** Solde restant dû, en centimes — jamais négatif affiché (un trop-perçu resterait visible en interne via les montants bruts). */
export function soldeRestant(facture: Facture, paiements: Paiement[], avoirs: Avoir[]): number {
  const encaisse = paiements.reduce((s, p) => s + p.montantTTC, 0);
  const avoirsTotal = avoirs.reduce((s, a) => s + a.montantTTC, 0);
  return facture.montantTTC - encaisse - avoirsTotal;
}

/** Statut persisté, dérivé uniquement des événements de paiement/avoir (jamais du simple écoulement du temps). */
export function statutApresEncaissement(
  facture: Facture,
  paiements: Paiement[],
  avoirs: Avoir[],
): StatutFacture {
  const solde = soldeRestant(facture, paiements, avoirs);
  if (solde <= 0) return "SOLDEE";
  if (paiements.length > 0 || avoirs.length > 0) return "PAYEE_PARTIELLEMENT";
  return "EMISE";
}

/** "Un impayé après délai" (dossier-cadrage) — état calculé à la lecture, jamais persisté. */
export function factureEnRetard(facture: Facture, solde: number): boolean {
  if (solde <= 0) return false;
  const echeance = new Date(facture.creeA).getTime() + facture.delaiPaiementJours * 86_400_000;
  return Date.now() > echeance;
}
