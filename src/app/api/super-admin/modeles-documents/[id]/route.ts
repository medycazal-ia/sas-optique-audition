import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

const CHAMPS_TEXTE = ["enteteNom", "enteteAdresse", "enteteSiret", "enteteTelephone", "enteteEmail", "texteIntro", "piedDePage"] as const;

/** PATCH /api/super-admin/modeles-documents/:id — modifie un modèle existant (jamais son type). */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non trouvé." }, { status: 404 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const donnees: Prisma.ModeleDocumentUpdateInput = {};
  if (typeof body.nom === "string" && body.nom.trim()) {
    donnees.nom = body.nom.trim();
  }
  for (const champ of CHAMPS_TEXTE) {
    if (typeof body[champ] === "string") {
      donnees[champ] = body[champ].trim() || null;
    }
  }

  if (Object.keys(donnees).length === 0) {
    return NextResponse.json({ erreur: "Aucun champ valide à mettre à jour." }, { status: 400 });
  }

  const modele = await prisma.modeleDocument.update({ where: { id }, data: donnees });
  return NextResponse.json(modele);
}

/** DELETE /api/super-admin/modeles-documents/:id */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non trouvé." }, { status: 404 });
  }
  const { id } = await params;
  await prisma.modeleDocument.delete({ where: { id } });
  return NextResponse.json({ supprime: true });
}
