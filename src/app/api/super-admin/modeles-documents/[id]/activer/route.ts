import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/super-admin/modeles-documents/:id/activer — bascule vers ce
 * modèle pour son type (un seul actif à la fois) : "switcher si je le
 * souhaite" sans perdre les autres modèles enregistrés, réactivables à
 * tout moment.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non trouvé." }, { status: 404 });
  }
  const { id } = await params;

  const modele = await prisma.modeleDocument.findUnique({ where: { id } });
  if (!modele) {
    return NextResponse.json({ erreur: "Modèle introuvable." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.modeleDocument.updateMany({ where: { type: modele.type, actif: true }, data: { actif: false } }),
    prisma.modeleDocument.update({ where: { id }, data: { actif: true } }),
  ]);

  return NextResponse.json({ actif: true });
}
