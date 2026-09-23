import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/dossiers/:id/propositions — toutes les propositions du dossier,
 * y compris refusées/remplacées : "une proposition refusée ou remplacée
 * reste consultable dans l'historique du dossier (jamais supprimée)".
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const propositions = await prisma.proposition.findMany({
    where: { personneId: id },
    orderBy: { creeA: "desc" },
    include: { lignes: true },
  });
  return NextResponse.json(propositions);
}

/**
 * POST /api/dossiers/:id/propositions — crée une nouvelle proposition
 * (toujours en brouillon). Si `remplaceId` est fourni, trace explicitement
 * qu'elle succède à une version précédente sans l'effacer.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const personne = await prisma.personne.findUnique({ where: { id } });
  if (!personne) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }

  const remplaceId = typeof body.remplaceId === "string" ? body.remplaceId : undefined;
  if (remplaceId) {
    const precedente = await prisma.proposition.findUnique({ where: { id: remplaceId } });
    if (!precedente || precedente.personneId !== id) {
      return NextResponse.json({ erreur: "remplaceId doit référencer une proposition du même dossier." }, { status: 400 });
    }
  }

  const proposition = await prisma.proposition.create({
    data: { personneId: id, remplaceId, notes: typeof body.notes === "string" ? body.notes : null },
  });

  await journaliser({
    type: "proposition.creee",
    entite: "Proposition",
    entiteId: proposition.id,
    personneId: id,
    acteur: session?.email,
    donnees: { remplaceId: remplaceId ?? null },
  });

  return NextResponse.json(proposition, { status: 201 });
}
