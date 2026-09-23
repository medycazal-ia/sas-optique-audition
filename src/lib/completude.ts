import type { Document, Ordonnance } from "@prisma/client";

export type PieceRequise = {
  type: "CARTE_VITALE" | "CARTE_MUTUELLE" | "ORDONNANCE";
  libelle: string;
  obtenue: boolean;
};

/**
 * Calcule la complétude du dossier : "liste des pièces obtenues / manquantes,
 * bouton d'action évident par pièce manquante" (module Dossier client, carte
 * "Complétude du dossier"). Volontairement recalculée à la volée (pas stockée)
 * pour ne jamais désynchroniser l'affichage de l'état réel des documents.
 */
export function calculerCompletude(documents: Pick<Document, "type">[]): PieceRequise[] {
  const typesPresents = new Set(documents.map((d) => d.type));
  return [
    { type: "CARTE_VITALE", libelle: "Carte Vitale", obtenue: typesPresents.has("CARTE_VITALE") },
    { type: "CARTE_MUTUELLE", libelle: "Carte de mutuelle", obtenue: typesPresents.has("CARTE_MUTUELLE") },
    { type: "ORDONNANCE", libelle: "Ordonnance", obtenue: typesPresents.has("ORDONNANCE") },
  ];
}

/**
 * "Fraîcheur" du dossier : ordonnance périmée ou approchant l'expiration.
 * Signal consommé par le module Pilotage (pas encore réalisé) — exposé ici
 * pour que l'UI du Dossier client l'affiche dès maintenant.
 */
export function ordonnancesPerimees(ordonnances: Pick<Ordonnance, "dateExpiration">[]): number {
  const maintenant = new Date();
  return ordonnances.filter((o) => o.dateExpiration && o.dateExpiration < maintenant).length;
}
