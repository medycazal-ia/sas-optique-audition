import { NextRequest, NextResponse } from "next/server";
import type { StatutProduit, TypeOrdonnance } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { calculerDescriptionProduit } from "@/lib/descriptionProduit";
import { type ChampTarif, type ValeursTarif, completerTarif } from "@/lib/tarificationProduit";

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

// "description" n'apparaît jamais ici : elle est recalculée automatiquement
// (voir lib/descriptionProduit.ts), jamais éditable directement.
const CHAMPS_TEXTE_SIMPLES = [
  "marque",
  "modele",
  "qrcode",
  "categorie",
  "taille",
  "coloris",
  "nomenclature",
  "remarque",
] as const;
const CHAMPS_NOMBRE_SIMPLES = ["prixAchat", "coefficient", "tauxTva", "prixVenteHT", "plafondRemise"] as const;
const STATUTS_VALIDES: StatutProduit[] = ["ACTIF", "RUPTURE", "DISCONTINUE"];
const ACTIVITES_VALIDES: TypeOrdonnance[] = ["OPTIQUE", "AUDITION"];

/**
 * PATCH /api/produits/:id — modification du produit. Un changement de
 * prixTTC crée une nouvelle ligne HistoriquePrix au lieu d'écraser
 * l'ancien prix — traçabilité en cas de litige (critère du module).
 * `description` est toujours recalculée à partir des champs source du
 * produit résultant (jamais acceptée en entrée) — voir lib/descriptionProduit.ts.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const produitActuel = await prisma.produit.findUnique({ where: { id } });
  if (!produitActuel) {
    return NextResponse.json({ erreur: "Produit introuvable." }, { status: 404 });
  }

  const donnees: Record<string, unknown> = {};
  for (const champ of CHAMPS_TEXTE_SIMPLES) {
    if (champ in body) donnees[champ] = typeof body[champ] === "string" ? body[champ].trim() || null : null;
  }
  for (const champ of CHAMPS_NOMBRE_SIMPLES) {
    if (champ in body) {
      const n = body[champ] === null || body[champ] === undefined || body[champ] === "" ? null : Number(body[champ]);
      donnees[champ] = n !== null && Number.isFinite(n) ? n : null;
    }
  }
  if ("statut" in body) donnees.statut = body.statut;
  if (typeof donnees.statut === "string" && !STATUTS_VALIDES.includes(donnees.statut as StatutProduit)) {
    return NextResponse.json({ erreur: `statut doit être l'un de : ${STATUTS_VALIDES.join(", ")}` }, { status: 400 });
  }

  if ("activite" in body) {
    if (!ACTIVITES_VALIDES.includes(body.activite)) {
      return NextResponse.json({ erreur: `activite doit être l'une de : ${ACTIVITES_VALIDES.join(", ")}` }, { status: 400 });
    }
    donnees.activite = body.activite;
  }

  if ("fournisseurId" in body) {
    donnees.fournisseurId = typeof body.fournisseurId === "string" && body.fournisseurId.trim() ? body.fournisseurId.trim() : null;
  }

  if ("dateDerniereSortie" in body) {
    donnees.dateDerniereSortie = body.dateDerniereSortie ? new Date(body.dateDerniereSortie) : null;
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

  // Rubriques tarifaires manquantes déduites de celles fournies/existantes
  // (prix achat HT × coefficient → prix vente HT → + TVA → prix TTC, et
  // sens inverse) — voir lib/tarificationProduit.ts. Ne complète jamais une
  // valeur déjà présente (fournie dans cette requête ou déjà en base).
  const avantCompletion: ValeursTarif = {
    prixAchat: ("prixAchat" in donnees ? donnees.prixAchat : produitActuel.prixAchat) as number | null,
    coefficient: ("coefficient" in donnees ? donnees.coefficient : produitActuel.coefficient) as number | null,
    tauxTva: ("tauxTva" in donnees ? donnees.tauxTva : produitActuel.tauxTva) as number | null,
    prixVenteHT: ("prixVenteHT" in donnees ? donnees.prixVenteHT : produitActuel.prixVenteHT) as number | null,
    prixTTC: prixChange ? nouveauPrix! : produitActuel.prixTTC,
  };
  const tarifComplete = completerTarif(avantCompletion);
  for (const champ of Object.keys(tarifComplete) as ChampTarif[]) {
    if (avantCompletion[champ] == null && tarifComplete[champ] != null) {
      donnees[champ] = tarifComplete[champ];
    }
  }

  if (Object.keys(donnees).length === 0) {
    return NextResponse.json({ erreur: "Aucun champ valide à mettre à jour." }, { status: 400 });
  }

  // description toujours recalculée à partir de l'état résultant (produit
  // actuel + champs modifiés par cette requête), jamais acceptée en entrée.
  const resultant = { ...produitActuel, ...donnees };
  donnees.description = calculerDescriptionProduit({
    modele: resultant.modele as string,
    taille: resultant.taille as string | null,
    coloris: resultant.coloris as string | null,
    nomenclature: resultant.nomenclature as string | null,
    prixTTC: (prixChange ? nouveauPrix! : produitActuel.prixTTC) as number,
    tauxTva: resultant.tauxTva as number | null,
    prixVenteHT: resultant.prixVenteHT as number | null,
  });

  let produit;
  try {
    produit = await prisma.produit.update({
      where: { id },
      data: {
        ...donnees,
        statut: donnees.statut as StatutProduit | undefined,
        ...(prixChange
          ? { historiquePrix: { create: { prixTTC: nouveauPrix!, modifiePar: session?.email } } }
          : {}),
      },
    });
  } catch (erreur: unknown) {
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002") {
      return NextResponse.json({ erreur: "Ce QR code ou cette référence est déjà utilisé par un autre produit." }, { status: 409 });
    }
    throw erreur;
  }

  await journaliser({
    type: "produit.modifie",
    entite: "Produit",
    entiteId: id,
    acteur: session?.email,
    donnees,
  });

  return NextResponse.json(produit);
}
