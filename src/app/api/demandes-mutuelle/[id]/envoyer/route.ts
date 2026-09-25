import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/demandes-mutuelle/:id/envoyer — à envoyer → envoyée.
 * Trace le moment d'envoi pour calculer le délai écoulé côté UI (critère
 * d'acceptation V1 : "pas de demande perdue faute de suivi").
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;

  const demande = await prisma.demandePriseEnCharge.findUnique({ where: { id } });
  if (!demande) {
    return NextResponse.json({ erreur: "Demande introuvable." }, { status: 404 });
  }
  if (demande.statut !== "A_ENVOYER") {
    return NextResponse.json({ erreur: "Seule une demande à envoyer peut être marquée envoyée." }, { status: 409 });
  }

  // Le FINESS peut avoir été complété sur l'ordonnance après la création de
  // cette demande (instantané pris à l'acceptation de la proposition) — on
  // relit la dernière ordonnance optique pour ne pas bloquer inutilement un
  // envoi devenu possible depuis, avant d'appliquer le blocage obligatoire
  // (une mutuelle exige le FINESS sur toute demande de prise en charge).
  const derniereOrdonnance = await prisma.ordonnance.findFirst({
    where: { personneId: demande.personneId, type: "OPTIQUE" },
    orderBy: { dateEmission: "desc" },
    select: { finess: true, rpps: true },
  });
  const finess = demande.finess ?? derniereOrdonnance?.finess ?? null;
  const rpps = demande.rpps ?? derniereOrdonnance?.rpps ?? null;

  if (!finess) {
    return NextResponse.json(
      {
        erreur:
          "FINESS du cabinet prescripteur manquant — complétez l'ordonnance (carte Fiche) avant d'envoyer cette demande.",
      },
      { status: 409 },
    );
  }

  const mise_a_jour = await prisma.demandePriseEnCharge.update({
    where: { id },
    data: { statut: "ENVOYEE", envoyeeA: new Date(), finess, rpps },
  });

  await journaliser({
    type: "demande-mutuelle.envoyee",
    entite: "DemandePriseEnCharge",
    entiteId: id,
    personneId: demande.personneId,
    acteur: session?.email,
  });

  return NextResponse.json(mise_a_jour);
}
