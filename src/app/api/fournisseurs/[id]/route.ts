import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

const CHAMPS = ["nom", "contact", "sav", "conditionsCommerciales", "remarques"] as const;

/** PATCH /api/fournisseurs/:id — modification de la fiche fournisseur. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const donnees: Record<string, unknown> = {};
  for (const champ of CHAMPS) {
    if (champ in body) donnees[champ] = typeof body[champ] === "string" ? body[champ].trim() || null : null;
  }
  if (donnees.nom === null || donnees.nom === "") {
    return NextResponse.json({ erreur: "Le nom du fournisseur est requis." }, { status: 400 });
  }
  if (Object.keys(donnees).length === 0) {
    return NextResponse.json({ erreur: "Aucun champ valide à mettre à jour." }, { status: 400 });
  }

  let fournisseur;
  try {
    fournisseur = await prisma.fournisseur.update({ where: { id }, data: donnees });
  } catch (erreur: unknown) {
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002") {
      return NextResponse.json({ erreur: "Un fournisseur porte déjà ce nom." }, { status: 409 });
    }
    throw erreur;
  }

  await journaliser({
    type: "fournisseur.modifie",
    entite: "Fournisseur",
    entiteId: id,
    acteur: session?.email,
    donnees,
  });

  return NextResponse.json(fournisseur);
}
