import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";

/** GET /api/super-admin/caisses-amo — annuaire des caisses de sécurité sociale (AMO), réservé au Super Admin. */
export async function GET() {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const caisses = await prisma.caisseAmo.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(caisses);
}

/** POST /api/super-admin/caisses-amo — ajoute une caisse à l'annuaire. */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const body = await request.json();
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  if (!nom) {
    return NextResponse.json({ erreur: "Le nom de la caisse est requis." }, { status: 400 });
  }

  let caisse;
  try {
    caisse = await prisma.caisseAmo.create({
      data: {
        nom,
        codeCaisse: typeof body.codeCaisse === "string" ? body.codeCaisse.trim() || null : null,
        telephone: typeof body.telephone === "string" ? body.telephone.trim() || null : null,
        email: typeof body.email === "string" ? body.email.trim() || null : null,
        adresse: typeof body.adresse === "string" ? body.adresse.trim() || null : null,
      },
    });
  } catch (erreur: unknown) {
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002") {
      return NextResponse.json({ erreur: "Une caisse porte déjà ce nom." }, { status: 409 });
    }
    throw erreur;
  }

  await journaliser({
    type: "caisse_amo.creee",
    entite: "CaisseAmo",
    entiteId: caisse.id,
    acteur: session?.email,
    donnees: { nom },
  });

  return NextResponse.json(caisse, { status: 201 });
}
