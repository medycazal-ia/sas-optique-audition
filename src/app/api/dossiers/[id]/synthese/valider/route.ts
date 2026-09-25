import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/dossiers/:id/synthese/valider — validation humaine explicite,
 * seule action qui acte définitivement la synthèse besoin dans le dossier.
 * Le validateur est désormais l'utilisateur authentifié (plus de saisie
 * libre du nom) — l'identité vient de la session, pas d'un champ texte.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });
  }
  const { id } = await params;

  const personne = await prisma.personne.update({
    where: { id },
    data: {
      syntheseBesoinValideeA: new Date(),
      syntheseBesoinValideePar: `${session.nom} <${session.email}>`,
    },
  });

  await journaliser({
    type: "synthese_besoin.validee",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: session.email,
    donnees: { validePar: session.email },
  });

  return NextResponse.json(personne);
}
