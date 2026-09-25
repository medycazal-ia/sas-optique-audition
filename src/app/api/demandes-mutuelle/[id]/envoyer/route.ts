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

  const mise_a_jour = await prisma.demandePriseEnCharge.update({
    where: { id },
    data: { statut: "ENVOYEE", envoyeeA: new Date() },
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
