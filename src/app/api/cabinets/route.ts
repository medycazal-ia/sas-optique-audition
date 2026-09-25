import { NextRequest, NextResponse } from "next/server";
import { rechercherCabinets } from "@/lib/cabinets";

/**
 * GET /api/cabinets?q=... — recherche dans l'annuaire des cabinets déjà
 * rencontrés (par nom ou FINESS), pour l'autocomplétion du formulaire de
 * correction du client (carte Fiche) — utile en saisie manuelle si l'OCR
 * a échoué, ou pour repérer une incohérence avec un FINESS déjà connu.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const cabinets = await rechercherCabinets(q);
  return NextResponse.json(cabinets);
}
