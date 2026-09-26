import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

const CHAMPS_TEXTE = ["nom", "email", "remarques"] as const;

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();

  const donnees: Record<string, unknown> = {};
  for (const champ of CHAMPS_TEXTE) {
    if (champ in body) donnees[champ] = typeof body[champ] === "string" ? body[champ].trim() || null : null;
  }
  if ("plateformes" in body) {
    donnees.plateformes = Array.isArray(body.plateformes)
      ? body.plateformes.filter((p: unknown): p is string => typeof p === "string" && p.trim() !== "").map((p: string) => p.trim())
      : [];
  }
  if ("makeScenarioId" in body) {
    donnees.makeScenarioId = body.makeScenarioId === null || body.makeScenarioId === "" ? null : Number(body.makeScenarioId);
  }
  if ("actif" in body) donnees.actif = Boolean(body.actif);

  if (Object.keys(donnees).length === 0) {
    return NextResponse.json({ erreur: "Aucun champ valide à mettre à jour." }, { status: 400 });
  }

  let boite;
  try {
    boite = await prisma.boiteMailTiersPayant.update({ where: { id }, data: donnees });
  } catch (erreur: unknown) {
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002") {
      return NextResponse.json({ erreur: "Cette adresse mail est déjà enregistrée." }, { status: 409 });
    }
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2025") {
      return NextResponse.json({ erreur: "Boîte mail introuvable." }, { status: 404 });
    }
    throw erreur;
  }

  await journaliser({
    type: "boite-mail-tiers-payant.modifiee",
    entite: "BoiteMailTiersPayant",
    entiteId: id,
    acteur: session?.email,
    donnees,
  });

  return NextResponse.json(boite);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const { id } = await params;

  try {
    await prisma.boiteMailTiersPayant.delete({ where: { id } });
  } catch (erreur: unknown) {
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2025") {
      return NextResponse.json({ erreur: "Boîte mail introuvable." }, { status: 404 });
    }
    throw erreur;
  }

  await journaliser({
    type: "boite-mail-tiers-payant.supprimee",
    entite: "BoiteMailTiersPayant",
    entiteId: id,
    acteur: session?.email,
  });

  return NextResponse.json({ ok: true });
}
