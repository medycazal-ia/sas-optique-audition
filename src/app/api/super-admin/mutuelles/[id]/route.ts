import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

const CHAMPS_TEXTE = ["nom", "plateforme", "identifiantAcces", "motDePasseAcces", "urlPortail", "telephone", "email", "remarques"] as const;

/** PATCH /api/super-admin/mutuelles/:id — modifie une fiche mutuelle (dont ses identifiants d'accès), réservé au Super Admin. */
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
  if ("delaiRemboursementJoursConnu" in body) {
    const n = body.delaiRemboursementJoursConnu === null ? null : Number(body.delaiRemboursementJoursConnu);
    donnees.delaiRemboursementJoursConnu = n !== null && Number.isInteger(n) && n >= 0 ? n : null;
  }

  if (Object.keys(donnees).length === 0) {
    return NextResponse.json({ erreur: "Aucun champ valide à mettre à jour." }, { status: 400 });
  }

  let mutuelle;
  try {
    mutuelle = await prisma.mutuelle.update({ where: { id }, data: donnees });
  } catch (erreur: unknown) {
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002") {
      return NextResponse.json({ erreur: "Une mutuelle porte déjà ce nom." }, { status: 409 });
    }
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2025") {
      return NextResponse.json({ erreur: "Mutuelle introuvable." }, { status: 404 });
    }
    throw erreur;
  }

  await journaliser({
    type: "mutuelle.modifiee",
    entite: "Mutuelle",
    entiteId: id,
    acteur: session?.email,
    donnees: { ...donnees, motDePasseAcces: donnees.motDePasseAcces !== undefined ? "***" : undefined },
  });

  return NextResponse.json(mutuelle);
}

/** DELETE /api/super-admin/mutuelles/:id — retire une mutuelle de l'annuaire, réservé au Super Admin. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const { id } = await params;

  const mutuelle = await prisma.mutuelle.delete({ where: { id } }).catch(() => null);
  if (!mutuelle) {
    return NextResponse.json({ erreur: "Mutuelle introuvable." }, { status: 404 });
  }

  await journaliser({
    type: "mutuelle.supprimee",
    entite: "Mutuelle",
    entiteId: id,
    acteur: session?.email,
    donnees: { nom: mutuelle.nom },
  });

  return NextResponse.json({ ok: true });
}
