import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import type { DemandePriseEnCharge } from "@prisma/client";

export type ResultatRepasserEnAttente =
  | { ok: true; demande: DemandePriseEnCharge }
  | { ok: false; erreur: string; status: number };

/**
 * Remet en attente une demande de prise en charge refusée — voir
 * /api/demandes-mutuelle/:id/repasser-en-attente (bouton "↩️ Repasser en
 * attente") et l'assistant vocal (lib/assistantVocal.ts), qui appellent
 * tous deux cette même fonction. Uniquement depuis REFUS : une demande déjà
 * en ACCORD ne se rouvre pas (impact facturation/reste à charge déjà
 * communiqué).
 */
export async function repasserDemandeEnAttente(demandeId: string, acteur?: string): Promise<ResultatRepasserEnAttente> {
  const demande = await prisma.demandePriseEnCharge.findUnique({ where: { id: demandeId } });
  if (!demande) {
    return { ok: false, erreur: "Demande introuvable.", status: 404 };
  }
  if (demande.statut !== "REFUS") {
    return { ok: false, erreur: "Seule une demande refusée peut être remise en attente.", status: 409 };
  }

  const mise_a_jour = await prisma.demandePriseEnCharge.update({
    where: { id: demandeId },
    data: { statut: "EN_ATTENTE", reponseA: null, motifRefus: null },
  });

  await journaliser({
    type: "demande-mutuelle.repassee_en_attente",
    entite: "DemandePriseEnCharge",
    entiteId: demandeId,
    personneId: demande.personneId,
    acteur,
    donnees: {},
  });

  return { ok: true, demande: mise_a_jour };
}
