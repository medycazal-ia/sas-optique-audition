/**
 * Remise commerciale par ligne de proposition (devis) — un pourcentage
 * choisi parmi un ensemble fermé de paliers, jamais une valeur libre, pour
 * rester fiable à la voix et éviter les remises fantaisistes ("133%").
 * Utilisé partout où un total de proposition est calculé (devis, facture,
 * calcul du reste à charge mutuelle — voir traitementMailAccordMutuelle.ts)
 * pour que ce soit toujours le même prix, réellement payé par le client,
 * qui compte.
 */
export const REMISES_AUTORISEES = [10, 20, 30, 50, 100] as const;
export type RemiseAutorisee = (typeof REMISES_AUTORISEES)[number];

export function estRemiseAutorisee(valeur: number): valeur is RemiseAutorisee {
  return (REMISES_AUTORISEES as readonly number[]).includes(valeur);
}

type LigneAvecRemise = { prixUnitaireTTC: number; quantite: number; remisePourcent?: number | null };

/** Montant TTC d'une ligne après remise, en centimes (arrondi au centime). */
export function montantLigneApresRemise(ligne: LigneAvecRemise): number {
  const brut = ligne.prixUnitaireTTC * ligne.quantite;
  const pourcent = ligne.remisePourcent ?? 0;
  return Math.round((brut * (100 - pourcent)) / 100);
}

/** Total TTC d'une proposition (somme des lignes après remise), en centimes. */
export function totalPropositionApresRemise(lignes: LigneAvecRemise[]): number {
  return lignes.reduce((somme, ligne) => somme + montantLigneApresRemise(ligne), 0);
}
