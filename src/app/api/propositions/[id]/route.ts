import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const proposition = await prisma.proposition.findUnique({
    where: { id },
    include: {
      personne: { select: { id: true, prenom: true, nom: true } },
      lignes: { include: { produit: true }, orderBy: { creeA: "asc" } },
      remplace: { select: { id: true, statut: true, creeA: true } },
      remplaceePar: { select: { id: true, statut: true, creeA: true } },
    },
  });
  if (!proposition) {
    return NextResponse.json({ erreur: "Proposition introuvable." }, { status: 404 });
  }
  return NextResponse.json(proposition);
}

/**
 * PATCH /api/propositions/:id — modification des notes / du marqueur
 * 100% Santé. Uniquement tant que la proposition est en brouillon : une
 * proposition déjà envoyée est un document tracé, on ne le retouche pas en
 * silence (créer une nouvelle version via remplaceId à la place).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const proposition = await prisma.proposition.findUnique({ where: { id } });
  if (!proposition) {
    return NextResponse.json({ erreur: "Proposition introuvable." }, { status: 404 });
  }
  if (proposition.statut !== "BROUILLON") {
    return NextResponse.json(
      { erreur: "Seule une proposition en brouillon peut être modifiée." },
      { status: 409 },
    );
  }

  const donnees: Record<string, unknown> = {};
  if (typeof body.notes === "string") donnees.notes = body.notes;
  if (typeof body.cent100Sante === "boolean") donnees.cent100Sante = body.cent100Sante;

  if (Object.keys(donnees).length === 0) {
    return NextResponse.json({ erreur: "Aucun champ valide à mettre à jour." }, { status: 400 });
  }

  const mise_a_jour = await prisma.proposition.update({ where: { id }, data: donnees });

  await journaliser({
    type: "proposition.modifiee",
    entite: "Proposition",
    entiteId: id,
    personneId: proposition.personneId,
    acteur: session?.email,
    donnees,
  });

  return NextResponse.json(mise_a_jour);
}
