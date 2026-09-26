import { formaterPrix } from "@/lib/argent";

/**
 * "Description" produit — jamais saisie librement : reprend nom (modèle),
 * taille, coloris, nomenclature, prix TTC, taux TVA et prix de vente HT, pour
 * être affichée telle quelle dans les devis/propositions et dans tous les
 * documents (actuels et à venir) à destination des mutuelles, de la sécurité
 * sociale et du client. Recalculée à chaque création/modification du produit
 * (voir src/app/api/produits/route.ts et .../[id]/route.ts) — jamais un champ
 * libre qui pourrait se désynchroniser des données source.
 */
export function calculerDescriptionProduit(produit: {
  modele: string;
  taille?: string | null;
  coloris?: string | null;
  nomenclature?: string | null;
  prixTTC: number;
  tauxTva?: number | null;
  prixVenteHT?: number | null;
}): string {
  const parties = [produit.modele];
  if (produit.taille) parties.push(`taille ${produit.taille}`);
  if (produit.coloris) parties.push(`coloris ${produit.coloris}`);
  if (produit.nomenclature) parties.push(`nomenclature ${produit.nomenclature}`);
  parties.push(`${formaterPrix(produit.prixTTC)} TTC`);
  if (produit.tauxTva !== null && produit.tauxTva !== undefined) {
    parties.push(`TVA ${(produit.tauxTva * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`);
  }
  if (produit.prixVenteHT !== null && produit.prixVenteHT !== undefined) {
    parties.push(`${formaterPrix(produit.prixVenteHT)} HT`);
  }
  return parties.join(" — ");
}
