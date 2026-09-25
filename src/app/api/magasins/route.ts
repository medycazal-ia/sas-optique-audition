import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/magasins — liste des points de vente, nécessaire au stock
 * multi-magasin du module Produits & catalogue.
 */
export async function GET() {
  const magasins = await prisma.magasin.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(magasins);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  if (!nom) {
    return NextResponse.json({ erreur: "Nom du magasin requis." }, { status: 400 });
  }
  const magasin = await prisma.magasin.create({
    data: { nom, ville: typeof body.ville === "string" ? body.ville.trim() || null : null },
  });
  return NextResponse.json(magasin, { status: 201 });
}
