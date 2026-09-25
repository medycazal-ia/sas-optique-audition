/** Formate un montant stocké en centimes (Produit.prixTTC) en euros affichables. */
export function formaterPrix(centimes: number): string {
  return (centimes / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

/** Parse une saisie utilisateur en euros (ex. "129,90" ou "129.9") vers des centimes. */
export function parserPrixEnCentimes(saisie: string): number | null {
  const normalise = saisie.trim().replace(",", ".").replace(/[^\d.]/g, "");
  if (!normalise) return null;
  const valeur = Number.parseFloat(normalise);
  if (Number.isNaN(valeur) || valeur < 0) return null;
  return Math.round(valeur * 100);
}
