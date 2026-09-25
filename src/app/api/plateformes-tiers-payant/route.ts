import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rechercherPlateformes } from "@/lib/plateformesTiersPayant";

/**
 * GET /api/plateformes-tiers-payant?q=... — recherche dans l'annuaire des
 * plateformes de tiers payant, pour l'autocomplétion de la carte Mutuelle.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const plateformes = await rechercherPlateformes(q);
  return NextResponse.json(plateformes);
}

/**
 * PATCH /api/plateformes-tiers-payant — saisie manuelle des coordonnées
 * (email/téléphone) d'une plateforme de l'annuaire, depuis la carte Mutuelle.
 * Ni Claude ni aucune recherche web n'a inventé ces coordonnées : les
 * plateformes ont été seedées par leur nom seul (migration
 * 20260925123000_mutuelle_plateforme_tiers_payant) — leurs coordonnées
 * professionnelles réelles n'étaient pas vérifiables avec certitude et sont
 * donc laissées à la saisie manuelle par l'équipe, ici.
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  if (!nom) {
    return NextResponse.json({ erreur: "nom requis." }, { status: 400 });
  }

  const emailPro = typeof body.emailPro === "string" ? body.emailPro.trim() || null : undefined;
  const telephonePro = typeof body.telephonePro === "string" ? body.telephonePro.trim() || null : undefined;

  const plateforme = await prisma.plateformeTiersPayant.upsert({
    where: { nom },
    update: { ...(emailPro !== undefined ? { emailPro } : {}), ...(telephonePro !== undefined ? { telephonePro } : {}) },
    create: { nom, emailPro: emailPro ?? null, telephonePro: telephonePro ?? null },
  });

  return NextResponse.json(plateforme);
}
