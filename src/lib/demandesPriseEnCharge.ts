import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import type { RangMutuelle } from "@prisma/client";

/**
 * Crée la ou les demandes de prise en charge déclenchées par l'acceptation
 * d'une proposition — extrait de la route de décision pour être réutilisé
 * par toute façon d'accepter une proposition (à l'écran, signature au
 * stylet, code SMS, papier scanné) sans dupliquer cette logique à chaque
 * fois. Crée une demande PRINCIPALE systématiquement, et une seconde
 * SECONDAIRE en plus si le dossier a une mutuelle surcomplémentaire
 * renseignée (voir Personne.mutuelle2Nom) — jamais à sa place.
 */
export async function creerDemandePriseEnCharge(params: {
  propositionId: string;
  personneId: string;
  acteur?: string;
}): Promise<void> {
  // FINESS/RPPS du prescripteur — une mutuelle les exige sur toute demande
  // de prise en charge ; copiés depuis la dernière ordonnance optique du
  // dossier au moment de la création (instantané, jamais recalculé après).
  const [derniereOrdonnance, personne] = await Promise.all([
    prisma.ordonnance.findFirst({
      where: { personneId: params.personneId, type: "OPTIQUE" },
      orderBy: { dateEmission: "desc" },
      select: { finess: true, rpps: true },
    }),
    prisma.personne.findUnique({ where: { id: params.personneId }, select: { mutuelle2Nom: true } }),
  ]);

  const rangs: RangMutuelle[] = ["PRINCIPALE", ...(personne?.mutuelle2Nom ? (["SECONDAIRE"] as const) : [])];

  for (const rang of rangs) {
    const demande = await prisma.demandePriseEnCharge.create({
      data: {
        propositionId: params.propositionId,
        personneId: params.personneId,
        rang,
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
      donnees: { rang },
    });
  }
}
