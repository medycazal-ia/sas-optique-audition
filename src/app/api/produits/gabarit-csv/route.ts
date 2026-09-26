import { NextResponse } from "next/server";
import { genererGabaritCsv } from "@/lib/importProduitsCsv";

/** GET /api/produits/gabarit-csv — modèle CSV vide (en-têtes + une ligne d'exemple) pour l'import en masse. */
export async function GET() {
  const csv = genererGabaritCsv();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="gabarit-produits.csv"',
    },
  });
}
