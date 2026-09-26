import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

/**
 * GET /api/fournisseurs — annuaire des fournisseurs (nom, contact, SAV,
 * conditions commerciales, remarques), lié aux produits par référence. Sert
 * au sélecteur fournisseur de la fiche produit et à l'import CSV en masse.
 */
export async function GET() {
  const fournisseurs = await prisma.fournisseur.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(fournisseurs);
}

/**
 * POST /api/fournisseurs — ajoute un fournisseur à l'annuaire. Seul `nom` est
 * requis (identifiant d'appariement lors de l'import CSV en masse).
 */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  const body = await request.json();

  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  if (!nom) {
    return NextResponse.json({ erreur: "Le nom du fournisseur est requis." }, { status: 400 });
  }

  const existant = await prisma.fournisseur.findUnique({ where: { nom } });
  if (existant) {
    return NextResponse.json({ erreur: "Un fournisseur porte déjà ce nom." }, { status: 409 });
  }

  const fournisseur = await prisma.fournisseur.create({
    data: {
      nom,
      contact: typeof body.contact === "string" ? body.contact.trim() || null : null,
      sav: typeof body.sav === "string" ? body.sav.trim() || null : null,
      conditionsCommerciales:
        typeof body.conditionsCommerciales === "string" ? body.conditionsCommerciales.trim() || null : null,
      remarques: typeof body.remarques === "string" ? body.remarques.trim() || null : null,
    },
  });

  await journaliser({
    type: "fournisseur.cree",
    entite: "Fournisseur",
    entiteId: fournisseur.id,
    acteur: session?.email,
    donnees: { nom },
  });

  return NextResponse.json(fournisseur, { status: 201 });
}
