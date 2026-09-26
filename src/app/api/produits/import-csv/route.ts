import { NextRequest, NextResponse } from "next/server";
import { importerProduitsCsv } from "@/lib/importProduitsCsv";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

/**
 * POST /api/produits/import-csv — import en masse. Body JSON { csv: string,
 * magasinId?: string }. Une référence déjà connue met à jour le produit
 * existant (upsert) plutôt que de créer un doublon — permet de réimporter un
 * fichier corrigé sans risque. magasinId optionnel : si fourni, la colonne
 * "quantite" de chaque ligne met aussi à jour le stock de ce magasin.
 */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  const body = await request.json();

  const csv = typeof body.csv === "string" ? body.csv : "";
  const magasinId = typeof body.magasinId === "string" && body.magasinId.trim() ? body.magasinId.trim() : null;

  if (!csv.trim()) {
    return NextResponse.json({ erreur: "Fichier CSV vide ou manquant." }, { status: 400 });
  }

  const { resultats, erreurs } = await importerProduitsCsv(csv, magasinId, session?.email);

  await journaliser({
    type: "produits.import_csv",
    entite: "Produit",
    entiteId: "import-masse",
    acteur: session?.email,
    donnees: {
      crees: resultats.filter((r) => r.statut === "creee").length,
      misAJour: resultats.filter((r) => r.statut === "mise_a_jour").length,
      erreurs: erreurs.length,
    },
  });

  return NextResponse.json({
    crees: resultats.filter((r) => r.statut === "creee").length,
    misAJour: resultats.filter((r) => r.statut === "mise_a_jour").length,
    erreurs,
  });
}
