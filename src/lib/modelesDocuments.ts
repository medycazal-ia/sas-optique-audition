import type { TypeModeleDocument, ModeleDocument } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Modèle actif pour un type de document donné (voir carte Super Admin >
 * Modèles de documents) — celui utilisé pour composer l'en-tête et le pied
 * de page du PDF généré. `null` si aucun modèle n'a encore été configuré ou
 * activé pour ce type : les générateurs de PDF doivent alors se rabattre
 * sur des valeurs par défaut sobres plutôt que d'échouer.
 */
export async function modeleActif(type: TypeModeleDocument): Promise<ModeleDocument | null> {
  return prisma.modeleDocument.findFirst({ where: { type, actif: true } });
}
