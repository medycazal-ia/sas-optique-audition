import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

const CHAMPS_TEXTE = ["nom", "codeCaisse", "telephone", "email", "adresse"] as const;

/** PATCH /api/super-admin/caisses-amo/:id — modifie une fiche caisse AMO, réservé au Super Admin. */
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
  if ("actif" in body) donnees.actif = body.actif === true;

  if (Object.keys(donnees).length === 0) {
    return NextResponse.json({ erreur: "Aucun champ valide à mettre à jour." }, { status: 400 });
  }

  let caisse;
  try {
    caisse = await prisma.caisseAmo.update({ where: { id }, data: donnees });
  } catch (erreur: unknown) {
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002") {
      return NextResponse.json({ erreur: "Une caisse porte déjà ce nom." }, { status: 409 });
    }
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2025") {
      return NextResponse.json({ erreur: "Caisse introuvable." }, { status: 404 });
    }
    throw erreur;
  }

  await journaliser({
    type: "caisse_amo.modifiee",
    entite: "CaisseAmo",
    entiteId: id,
    acteur: session?.email,
    donnees,
  });

  return NextResponse.json(caisse);
}

/** DELETE /api/super-admin/caisses-amo/:id — retire une caisse de l'annuaire, réservé au Super Admin. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const { id } = await params;

  const caisse = await prisma.caisseAmo.delete({ where: { id } }).catch(() => null);
  if (!caisse) {
    return NextResponse.json({ erreur: "Caisse introuvable." }, { status: 404 });
  }

  await journaliser({
    type: "caisse_amo.supprimee",
    entite: "CaisseAmo",
    entiteId: id,
    acteur: session?.email,
    donnees: { nom: caisse.nom },
  });

  return NextResponse.json({ ok: true });
}
