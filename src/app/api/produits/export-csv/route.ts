import { NextResponse } from "next/server";
import { genererExportCsv } from "@/lib/importProduitsCsv";

/** GET /api/produits/export-csv — export du catalogue courant, mêmes colonnes que le gabarit d'import. */
export async function GET() {
  const csv = await genererExportCsv();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="catalogue-produits.csv"',
    },
  });
}
