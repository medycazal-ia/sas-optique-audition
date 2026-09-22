import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PUT /api/dossiers/:id/synthese — enregistre un brouillon de synthèse besoin
 * (mini-audit vocal transformé par l'IA), non validé.
 * Critère d'acceptation V1 : "la synthèse générée par IA n'est jamais
 * enregistrée sans validation humaine explicite" — ce endpoint N'ACTE PAS la
 * synthèse, il la stocke en brouillon éditable. Voir
 * POST /api/dossiers/:id/synthese/valider pour la validation.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  if (typeof body.syntheseBesoin !== "string") {
    return NextResponse.json({ erreur: "syntheseBesoin (texte) requis." }, { status: 400 });
  }

  const personne = await prisma.personne.update({
    where: { id },
    data: {
      syntheseBesoin: body.syntheseBesoin,
      // Toute modification du texte invalide une validation précédente :
      // la synthèse doit être revalidée après édition.
      syntheseBesoinValideeA: null,
      syntheseBesoinValideePar: null,
    },
  });

  await journaliser({
    type: "synthese_besoin.brouillon",
    entite: "Personne",
    entiteId: id,
    personneId: id,
  });

  return NextResponse.json(personne);
}
