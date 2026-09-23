import { NextRequest, NextResponse } from "next/server";
import type { StatutProduit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/produits/:id — fiche produit avec stock par magasin (toujours
 * relu, jamais mis en cache) et historique de prix complet.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const produit = await prisma.produit.findUnique({
    where: { id },
    include: {
      stocks: { include: { magasin: true }, orderBy: { magasin: { nom: "asc" } } },
      historiquePrix: { orderBy: { effectifA: "desc" } },
    },
  });
  if (!produit) {
    return NextResponse.json({ erreur: "Produit introuvable." }, { status: 404 });
  }
  return NextResponse.json(produit);
}

const CHAMPS_SIMPLES = ["marque", "modele", "description", "statut"] as const;
const STATUTS_VALIDES: StatutProduit[] = ["ACTIF", "RUPTURE", "DISCONTINUE"];

/**
 * PATCH /api/produits/:id — modification du produit. Un changement de
 * prixTTC crée une nouvelle ligne HistoriquePrix au lieu d'écraser
 * l'ancien prix — traçabilité en cas de litige (critère du module).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const donnees: Record<string, unknown> = {};
  for (const champ of CHAMPS_SIMPLES) {
    if (champ in body) donnees[champ] = body[champ];
  }
  if (typeof donnees.statut === "string" && !STATUTS_VALIDES.includes(donnees.statut as StatutProduit)) {
    return NextResponse.json({ erreur: `statut doit être l'un de : ${STATUTS_VALIDES.join(", ")}` }, { status: 400 });
  }

  if ("garantieMois" in body) {
    const garantieMois = body.garantieMois === null ? null : Number(body.garantieMois);
    if (garantieMois !== null && (!Number.isInteger(garantieMois) || garantieMois < 0)) {
      return NextResponse.json({ erreur: "garantieMois doit être un entier positif ou nul." }, { status: 400 });
    }
    donnees.garantieMois = garantieMois;
  }

  const nouveauPrix = body.prixTTC !== undefined ? Number(body.prixTTC) : undefined;
  const prixChange = nouveauPrix !== undefined && Number.isFinite(nouveauPrix) && nouveauPrix >= 0;
  if (prixChange) {
    donnees.prixTTC = nouveauPrix;
  }

  if (Object.keys(donnees).length === 0) {
    return NextResponse.json({ erreur: "Aucun champ valide à mettre à jour." }, { status: 400 });
  }

  const produit = await prisma.produit.update({
    where: { id },
    data: {
      ...donnees,
      statut: donnees.statut as StatutProduit | undefined,
      ...(prixChange
        ? { historiquePrix: { create: { prixTTC: nouveauPrix!, modifiePar: session?.email } } }
        : {}),
    },
  });

  await journaliser({
    type: "produit.modifie",
    entite: "Produit",
    entiteId: id,
    acteur: session?.email,
    donnees,
  });

  return NextResponse.json(produit);
}
