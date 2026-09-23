import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/propositions/:id/envoyer — brouillon → envoyée. Nécessite au
 * moins une ligne : on ne présente jamais une proposition vide au client.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;

  const proposition = await prisma.proposition.findUnique({ where: { id }, include: { lignes: true } });
  if (!proposition) {
    return NextResponse.json({ erreur: "Proposition introuvable." }, { status: 404 });
  }
  if (proposition.statut !== "BROUILLON") {
    return NextResponse.json({ erreur: "Seule une proposition en brouillon peut être envoyée." }, { status: 409 });
  }
  if (proposition.lignes.length === 0) {
    return NextResponse.json({ erreur: "Ajouter au moins un produit avant d'envoyer la proposition." }, { status: 400 });
  }

  const mise_a_jour = await prisma.proposition.update({
    where: { id },
    data: { statut: "ENVOYEE", envoyeeA: new Date() },
  });

  await journaliser({
    type: "proposition.envoyee",
    entite: "Proposition",
    entiteId: id,
    personneId: proposition.personneId,
    acteur: session?.email,
  });

  return NextResponse.json(mise_a_jour);
}
