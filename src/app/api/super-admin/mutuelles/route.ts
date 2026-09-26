import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";

const CHAMPS = [
  "nom",
  "plateforme",
  "identifiantAcces",
  "motDePasseAcces",
  "urlPortail",
  "telephone",
  "email",
  "remarques",
] as const;

/** GET /api/super-admin/mutuelles — annuaire des mutuelles (AMC), réservé au Super Admin (porte des identifiants de portail). */
export async function GET() {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const mutuelles = await prisma.mutuelle.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(mutuelles);
}

/** POST /api/super-admin/mutuelles — ajoute une mutuelle à l'annuaire. */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const body = await request.json();
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  if (!nom) {
    return NextResponse.json({ erreur: "Le nom de la mutuelle est requis." }, { status: 400 });
  }

  const donnees: Record<string, unknown> = { nom };
  for (const champ of CHAMPS) {
    if (champ === "nom") continue;
    if (champ in body) donnees[champ] = typeof body[champ] === "string" ? body[champ].trim() || null : null;
  }

  let mutuelle;
  try {
    mutuelle = await prisma.mutuelle.create({ data: donnees as Parameters<typeof prisma.mutuelle.create>[0]["data"] });
  } catch (erreur: unknown) {
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002") {
      return NextResponse.json({ erreur: "Une mutuelle porte déjà ce nom." }, { status: 409 });
    }
    throw erreur;
  }

  await journaliser({
    type: "mutuelle.creee",
    entite: "Mutuelle",
    entiteId: mutuelle.id,
    acteur: session?.email,
    donnees: { nom },
  });

  return NextResponse.json(mutuelle, { status: 201 });
}
