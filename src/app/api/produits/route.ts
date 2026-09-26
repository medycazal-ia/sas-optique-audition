import { NextRequest, NextResponse } from "next/server";
import type { Prisma, StatutProduit, TypeOrdonnance, TypeProduit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { calculerDescriptionProduit } from "@/lib/descriptionProduit";

const TYPES_VALIDES: TypeProduit[] = [
  "MONTURE",
  "VERRE",
  "LENTILLE",
  "ACCESSOIRE",
  "APPAREIL_AUDITIF",
  "ECOUTEUR",
  "PILE_AUDITIVE",
  "ACCESSOIRE_AUDITIF",
];
const ACTIVITES_VALIDES: TypeOrdonnance[] = ["OPTIQUE", "AUDITION"];

/** Lit un champ texte optionnel du body : chaîne non vide, sinon null. */
function texteOptionnel(valeur: unknown): string | null {
  return typeof valeur === "string" && valeur.trim() ? valeur.trim() : null;
}

/** Lit un champ numérique optionnel du body : nombre fini, sinon null. */
function nombreOptionnel(valeur: unknown): number | null {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const n = Number(valeur);
  return Number.isFinite(n) ? n : null;
}

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
 * trace de son origine). Reprend toutes les rubriques du modèle d'import
 * CSV en masse (voir src/lib/importProduitsCsv.ts) : toutes optionnelles
 * sauf type/reference/prixTTC, mais toutes prises en compte ici pour que la
 * création manuelle et l'import en masse partagent exactement la même
 * logique. `description` n'est jamais acceptée en entrée : elle est
 * recalculée automatiquement (voir lib/descriptionProduit.ts).
 *
 * Le bouton "validation" de la page de création peut fournir magasinId +
 * quantite pour appliquer en direct la quantité initiale sur le stock du
 * magasin choisi, sans étape supplémentaire.
 */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  const body = await request.json();

  const type = body.type;
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  const marque = typeof body.marque === "string" ? body.marque.trim() : "";
  const modele = typeof body.modele === "string" ? body.modele.trim() : "";
  const prixTTC = Number(body.prixTTC);
  const activite = ACTIVITES_VALIDES.includes(body.activite) ? (body.activite as TypeOrdonnance) : "OPTIQUE";

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

  const qrcode = texteOptionnel(body.qrcode);
  const categorie = texteOptionnel(body.categorie);
  const taille = texteOptionnel(body.taille);
  const coloris = texteOptionnel(body.coloris);
  const nomenclature = texteOptionnel(body.nomenclature);
  const remarque = texteOptionnel(body.remarque);
  const fournisseurId = texteOptionnel(body.fournisseurId);
  const prixAchat = nombreOptionnel(body.prixAchat);
  const coefficient = nombreOptionnel(body.coefficient);
  const tauxTva = nombreOptionnel(body.tauxTva);
  const prixVenteHT = nombreOptionnel(body.prixVenteHT);
  const plafondRemise = nombreOptionnel(body.plafondRemise);
  const dateDerniereSortieBrute = texteOptionnel(body.dateDerniereSortie);
  const dateDerniereSortie = dateDerniereSortieBrute ? new Date(dateDerniereSortieBrute) : null;

  const description = calculerDescriptionProduit({ modele, taille, coloris, nomenclature, prixTTC, tauxTva, prixVenteHT });

  const produit = await prisma.produit.create({
    data: {
      type: type as TypeProduit,
      activite,
      reference,
      qrcode: qrcode ?? reference,
      categorie,
      marque,
      modele,
      taille,
      coloris,
      nomenclature,
      description,
      prixAchat,
      coefficient,
      prixTTC,
      tauxTva,
      prixVenteHT,
      plafondRemise,
      remarque,
      dateDerniereSortie,
      statut: (body.statut as StatutProduit) ?? "ACTIF",
      fournisseurId,
      historiquePrix: { create: { prixTTC, modifiePar: session?.email } },
    },
  });

  const magasinId = texteOptionnel(body.magasinId);
  const quantiteInitiale = nombreOptionnel(body.quantite);
  if (magasinId && quantiteInitiale !== null && Number.isInteger(quantiteInitiale) && quantiteInitiale >= 0) {
    const magasin = await prisma.magasin.findUnique({ where: { id: magasinId } });
    if (magasin) {
      await prisma.stock.create({ data: { produitId: produit.id, magasinId, quantite: quantiteInitiale } });
    }
  }

  await journaliser({
    type: "produit.cree",
    entite: "Produit",
    entiteId: produit.id,
    acteur: session?.email,
    donnees: { reference, marque, modele, prixTTC },
  });

  return NextResponse.json(produit, { status: 201 });
}
