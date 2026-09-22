import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/dossiers/:id/synthese/valider — validation humaine explicite,
 * seule action qui acte définitivement la synthèse besoin dans le dossier.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  const validePar = typeof body.validePar === "string" && body.validePar.trim() ? body.validePar.trim() : null;
  if (!validePar) {
    return NextResponse.json(
      { erreur: "validePar (nom du collaborateur qui valide) est requis." },
      { status: 400 },
    );
  }

  const personne = await prisma.personne.update({
    where: { id },
    data: {
      syntheseBesoinValideeA: new Date(),
      syntheseBesoinValideePar: validePar,
    },
  });

  await journaliser({
    type: "synthese_besoin.validee",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: validePar,
    donnees: { validePar },
  });

  return NextResponse.json(personne);
}
