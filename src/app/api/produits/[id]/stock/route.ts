import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PUT /api/produits/:id/stock — définit la quantité disponible pour un
 * magasin donné (crée la ligne Stock si elle n'existe pas encore).
 * "Aucun produit ne peut être ajouté à une proposition sans vérification
 * de disponibilité" (critère V1) : ce endpoint est la seule façon de faire
 * évoluer ce chiffre, jamais une modification directe en base.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: produitId } = await params;
  const body = await request.json();

  const magasinId = typeof body.magasinId === "string" ? body.magasinId : "";
  const quantite = Number(body.quantite);
  const delaiJoursReappro =
    body.delaiJoursReappro === null || body.delaiJoursReappro === undefined
      ? null
      : Number(body.delaiJoursReappro);

  if (!magasinId) {
    return NextResponse.json({ erreur: "magasinId requis." }, { status: 400 });
  }
  if (!Number.isInteger(quantite) || quantite < 0) {
    return NextResponse.json({ erreur: "quantite doit être un entier positif ou nul." }, { status: 400 });
  }

  const [produit, magasin] = await Promise.all([
    prisma.produit.findUnique({ where: { id: produitId } }),
    prisma.magasin.findUnique({ where: { id: magasinId } }),
  ]);
  if (!produit) return NextResponse.json({ erreur: "Produit introuvable." }, { status: 404 });
  if (!magasin) return NextResponse.json({ erreur: "Magasin introuvable." }, { status: 404 });

  const stock = await prisma.stock.upsert({
    where: { produitId_magasinId: { produitId, magasinId } },
    create: { produitId, magasinId, quantite, delaiJoursReappro },
    update: { quantite, delaiJoursReappro },
  });

  await journaliser({
    type: "stock.ajuste",
    entite: "Stock",
    entiteId: stock.id,
    acteur: session?.email,
    donnees: { produitId, magasinId, quantite, delaiJoursReappro },
  });

  return NextResponse.json(stock);
}
