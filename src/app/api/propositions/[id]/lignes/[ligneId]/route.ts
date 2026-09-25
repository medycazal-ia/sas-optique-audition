import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string; ligneId: string }> };

/**
 * DELETE /api/propositions/:id/lignes/:ligneId — retire une ligne d'une
 * proposition encore en brouillon (une fois envoyée, la proposition est un
 * document tracé et ne se modifie plus).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: propositionId, ligneId } = await params;

  const proposition = await prisma.proposition.findUnique({ where: { id: propositionId } });
  if (!proposition) {
    return NextResponse.json({ erreur: "Proposition introuvable." }, { status: 404 });
  }
  if (proposition.statut !== "BROUILLON") {
    return NextResponse.json({ erreur: "Seule une proposition en brouillon peut être modifiée." }, { status: 409 });
  }

  const ligne = await prisma.propositionLigne.findUnique({ where: { id: ligneId } });
  if (!ligne || ligne.propositionId !== propositionId) {
    return NextResponse.json({ erreur: "Ligne introuvable." }, { status: 404 });
  }

  await prisma.propositionLigne.delete({ where: { id: ligneId } });

  await journaliser({
    type: "proposition.ligne_retiree",
    entite: "PropositionLigne",
    entiteId: ligneId,
    personneId: proposition.personneId,
    acteur: session?.email,
    donnees: { produitId: ligne.produitId },
  });

  return NextResponse.json({ ok: true });
}
