import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";

const TYPES_VALIDES = ["FACTURE", "DEVIS_NORMALISE", "DEVIS_NON_NORMALISE", "ACCORD_TIERS_PAYANT"] as const;

const CHAMPS_TEXTE = ["enteteNom", "enteteAdresse", "enteteSiret", "enteteTelephone", "enteteEmail", "texteIntro", "piedDePage"] as const;

/**
 * GET/POST /api/super-admin/modeles-documents — carte Super Admin
 * "Modèles de documents" : "un espace pour configurer ces documents à sa
 * guise, sauvegarder et switcher" — plusieurs modèles nommés par type,
 * jamais un seul champ écrasé à chaque changement (voir prisma/schema.prisma).
 */
export async function GET(request: NextRequest) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non trouvé." }, { status: 404 });
  }
  const type = request.nextUrl.searchParams.get("type");
  const modeles = await prisma.modeleDocument.findMany({
    where: type ? { type: type as (typeof TYPES_VALIDES)[number] } : undefined,
    orderBy: [{ type: "asc" }, { creeA: "desc" }],
  });
  return NextResponse.json(modeles);
}

export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non trouvé." }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));

  const type = body.type;
  if (!TYPES_VALIDES.includes(type)) {
    return NextResponse.json({ erreur: `type doit être l'un de : ${TYPES_VALIDES.join(", ")}.` }, { status: 400 });
  }
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  if (!nom) {
    return NextResponse.json({ erreur: "nom requis." }, { status: 400 });
  }

  const donnees: Prisma.ModeleDocumentCreateInput = { type, nom };
  for (const champ of CHAMPS_TEXTE) {
    if (typeof body[champ] === "string") {
      donnees[champ] = body[champ].trim() || null;
    }
  }

  const modele = await prisma.modeleDocument.create({ data: donnees });
  return NextResponse.json(modele, { status: 201 });
}
