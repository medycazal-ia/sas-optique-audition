import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";

/**
 * Crée la demande de prise en charge déclenchée par l'acceptation d'une
 * proposition — extrait de la route de décision pour être réutilisé par
 * toute façon d'accepter une proposition (à l'écran, signature au stylet,
 * code SMS, papier scanné) sans dupliquer cette logique à chaque fois.
 */
export async function creerDemandePriseEnCharge(params: {
  propositionId: string;
  personneId: string;
  acteur?: string;
}): Promise<void> {
  // FINESS/RPPS du prescripteur — une mutuelle les exige sur toute demande
  // de prise en charge ; copiés depuis la dernière ordonnance optique du
  // dossier au moment de la création (instantané, jamais recalculé après).
  const derniereOrdonnance = await prisma.ordonnance.findFirst({
    where: { personneId: params.personneId, type: "OPTIQUE" },
    orderBy: { dateEmission: "desc" },
    select: { finess: true, rpps: true },
  });

  const demande = await prisma.demandePriseEnCharge.create({
    data: {
      propositionId: params.propositionId,
      personneId: params.personneId,
      finess: derniereOrdonnance?.finess ?? null,
      rpps: derniereOrdonnance?.rpps ?? null,
    },
  });

  await journaliser({
    type: "demande-mutuelle.creee",
    entite: "DemandePriseEnCharge",
    entiteId: demande.id,
    personneId: params.personneId,
    acteur: params.acteur,
  });
}
