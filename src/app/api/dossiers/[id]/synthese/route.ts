import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { estMatiereMontureBesoin, estStyleBesoin, estTraitementVerreBesoin, estVisionBesoin } from "@/lib/besoinsExprimes";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PUT /api/dossiers/:id/synthese — enregistre un brouillon de synthèse besoin
 * et des besoins exprimés structurés (mini-audit vocal transformé par
 * l'IA — voir POST .../extraire), non validés.
 * Critère d'acceptation V1 : "la synthèse générée par IA n'est jamais
 * enregistrée sans validation humaine explicite" — ce endpoint N'ACTE PAS la
 * synthèse, il la stocke en brouillon éditable. Voir
 * POST /api/dossiers/:id/synthese/valider pour la validation.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  if (typeof body.syntheseBesoin !== "string") {
    return NextResponse.json({ erreur: "syntheseBesoin (texte) requis." }, { status: 400 });
  }
  const vision = body.visionBesoin;
  if (vision !== null && vision !== undefined && !estVisionBesoin(vision)) {
    return NextResponse.json({ erreur: "visionBesoin invalide." }, { status: 400 });
  }
  const traitements = Array.isArray(body.traitementsVerreBesoin) ? body.traitementsVerreBesoin : [];
  if (!traitements.every((t: unknown) => typeof t === "string" && estTraitementVerreBesoin(t))) {
    return NextResponse.json({ erreur: "traitementsVerreBesoin invalide." }, { status: 400 });
  }
  const matiere = body.matiereMontureBesoin;
  if (matiere !== null && matiere !== undefined && !estMatiereMontureBesoin(matiere)) {
    return NextResponse.json({ erreur: "matiereMontureBesoin invalide." }, { status: 400 });
  }
  const style = Array.isArray(body.styleBesoin) ? body.styleBesoin : [];
  if (!style.every((s: unknown) => typeof s === "string" && estStyleBesoin(s))) {
    return NextResponse.json({ erreur: "styleBesoin invalide." }, { status: 400 });
  }

  const personne = await prisma.personne.update({
    where: { id },
    data: {
      syntheseBesoin: body.syntheseBesoin,
      transcriptionBesoin: typeof body.transcriptionBesoin === "string" ? body.transcriptionBesoin : undefined,
      visionBesoin: vision ?? null,
      traitementsVerreBesoin: traitements,
      matiereMontureBesoin: matiere ?? null,
      styleBesoin: style,
      // Toute modification invalide une validation précédente : la
      // synthèse et les besoins exprimés doivent être revalidés après édition.
      syntheseBesoinValideeA: null,
      syntheseBesoinValideePar: null,
    },
  });

  await journaliser({
    type: "synthese_besoin.brouillon",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: session?.email,
  });

  return NextResponse.json(personne);
}
