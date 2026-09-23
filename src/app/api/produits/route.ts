import { NextRequest, NextResponse } from "next/server";
import type { Prisma, StatutProduit, TypeProduit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

const TYPES_VALIDES: TypeProduit[] = ["MONTURE", "VERRE", "LENTILLE", "ACCESSOIRE"];

/**
 * GET /api/produits — recherche produit. Critère d'acceptation V1 : jamais de
 * tarif ou disponibilité en cache périmé — chaque appel relit la base.
 * Filtres : ?q= (référence/marque/modèle), ?type=, ?disponible=1.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const type = params.get("type");
  const disponibleSeulement = params.get("disponible") === "1";

  const where: Prisma.ProduitWhereInput = {};
  if (type && TYPES_VALIDES.includes(type as TypeProduit)) {
    where.type = type as TypeProduit;
  }
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { marque: { contains: q, mode: "insensitive" } },
      { modele: { contains: q, mode: "insensitive" } },
    ];
  }
  if (disponibleSeulement) {
    where.stocks = { some: { quantite: { gt: 0 } } };
  }

  const produits = await prisma.produit.findMany({
    where,
    orderBy: [{ marque: "asc" }, { modele: "asc" }],
    include: { stocks: true },
  });

  return NextResponse.json(produits);
}

/**
 * POST /api/produits — ajoute un article au catalogue. Le premier prix
 * saisi crée aussi la première ligne HistoriquePrix (jamais de prix sans
 * trace de son origine).
 */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  const body = await request.json();

  const type = body.type;
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  const marque = typeof body.marque === "string" ? body.marque.trim() : "";
  const modele = typeof body.modele === "string" ? body.modele.trim() : "";
  const prixTTC = Number(body.prixTTC);

  if (!TYPES_VALIDES.includes(type)) {
    return NextResponse.json({ erreur: `type doit être l'un de : ${TYPES_VALIDES.join(", ")}` }, { status: 400 });
  }
  if (!reference || !marque || !modele) {
    return NextResponse.json({ erreur: "Référence, marque et modèle sont requis." }, { status: 400 });
  }
  if (!Number.isFinite(prixTTC) || prixTTC < 0) {
    return NextResponse.json({ erreur: "prixTTC (en centimes, entier positif) requis." }, { status: 400 });
  }

  const existant = await prisma.produit.findUnique({ where: { reference } });
  if (existant) {
    return NextResponse.json({ erreur: "Cette référence existe déjà dans le catalogue." }, { status: 409 });
  }

  const produit = await prisma.produit.create({
    data: {
      type: type as TypeProduit,
      reference,
      marque,
      modele,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      prixTTC,
      statut: (body.statut as StatutProduit) ?? "ACTIF",
      historiquePrix: { create: { prixTTC, modifiePar: session?.email } },
    },
  });

  await journaliser({
    type: "produit.cree",
    entite: "Produit",
    entiteId: produit.id,
    acteur: session?.email,
    donnees: { reference, marque, modele, prixTTC },
  });

  return NextResponse.json(produit, { status: 201 });
}
