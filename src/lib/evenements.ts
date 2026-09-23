import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Journalise un événement d'audit. Voir docs/dossier-cadrage.md > "Modèle de
 * données" : "chaque écriture significative génère un Événement journalisé —
 * jamais de modification silencieuse".
 */
export async function journaliser(params: {
  type: string;
  entite: string;
  entiteId: string;
  personneId?: string;
  acteur?: string;
  canal?: string;
  donnees?: Record<string, unknown>;
}) {
  return prisma.evenement.create({
    data: {
      type: params.type,
      entite: params.entite,
      entiteId: params.entiteId,
      personneId: params.personneId,
      acteur: params.acteur ?? "comptoir",
      canal: params.canal ?? "web",
      donnees: params.donnees as Prisma.InputJsonValue | undefined,
    },
  });
}
