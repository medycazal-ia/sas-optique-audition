import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/dossiers/:id — fiche dossier complète (niveau 2 de l'entonnoir
 * inversé : documents, ordonnances, événements journalisés).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const personne = await prisma.personne.findUnique({
    where: { id },
    include: {
      foyer: true,
      documents: { orderBy: { creeA: "desc" } },
      ordonnances: { orderBy: { creeA: "desc" } },
      evenements: { orderBy: { survenuA: "desc" }, take: 50 },
    },
  });

  if (!personne) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }

  return NextResponse.json(personne);
}

const CHAMPS_MODIFIABLES = [
  "civilite",
  "prenom",
  "nom",
  "numeroSecuriteSociale",
  "telephone",
  "email",
  "adresse",
  "codePostal",
  "ville",
  "contactPrefereSms",
  "contactPrefereEmail",
] as const;

/**
 * PATCH /api/dossiers/:id — mise à jour des informations personnelles.
 * Ne touche jamais aux consentements ni à la synthèse besoin (endpoints
 * dédiés ci-dessous) pour garder une trace d'audit précise par type de
 * modification.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const donnees: Record<string, unknown> = {};
  for (const champ of CHAMPS_MODIFIABLES) {
    if (champ in body) {
      donnees[champ] = body[champ];
    }
  }

  if (Object.keys(donnees).length === 0) {
    return NextResponse.json({ erreur: "Aucun champ valide à mettre à jour." }, { status: 400 });
  }

  const personne = await prisma.personne.update({ where: { id }, data: donnees });

  await journaliser({
    type: "personne.modifiee",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: session?.email,
    donnees,
  });

  return NextResponse.json(personne);
}
