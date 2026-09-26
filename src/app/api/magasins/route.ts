import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession, sessionEstDirecteurOuPlus } from "@/lib/auth";

/**
 * GET /api/magasins — liste des points de vente, nécessaire au stock
 * multi-magasin du module Produits & catalogue. Lecture ouverte à tout
 * compte connecté (déjà consommé par les formulaires produit) : seule la
 * création/modification est réservée (voir POST/PATCH ci-dessous et
 * /super-admin/magasins).
 */
export async function GET() {
  const magasins = await prisma.magasin.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(magasins);
}

/** POST /api/magasins — création d'un point de vente, réservée à un DIRECTEUR ou plus (voir /super-admin/magasins). */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!sessionEstDirecteurOuPlus(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const body = await request.json();
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  if (!nom) {
    return NextResponse.json({ erreur: "Nom du magasin requis." }, { status: 400 });
  }
  const magasin = await prisma.magasin.create({
    data: { nom, ville: typeof body.ville === "string" ? body.ville.trim() || null : null },
  });

  await journaliser({
    type: "magasin.cree",
    entite: "Magasin",
    entiteId: magasin.id,
    acteur: session?.email,
    donnees: { nom },
  });

  return NextResponse.json(magasin, { status: 201 });
}
