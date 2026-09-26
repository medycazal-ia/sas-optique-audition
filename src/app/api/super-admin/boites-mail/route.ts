import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";

/**
 * GET/POST /api/super-admin/boites-mail — référence des boîtes mail
 * surveillées pour la recherche automatique des accords/refus de prise en
 * charge (voir lib/traitementMailAccordMutuelle.ts). Ne contient aucun
 * identifiant de connexion : la connexion réelle (OAuth Gmail/Microsoft
 * 365) se configure dans Make, pas ici — cette table documente quelle
 * boîte couvre quelles plateformes et relie chaque boîte à son scénario
 * Make (pour la relance manuelle, voir /api/dossiers/:id/recherche-accord).
 */
export async function GET() {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const boites = await prisma.boiteMailTiersPayant.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(boites);
}

export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const body = await request.json();
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!nom || !email) {
    return NextResponse.json({ erreur: "Le nom et l'adresse mail sont requis." }, { status: 400 });
  }
  const plateformes = Array.isArray(body.plateformes)
    ? body.plateformes.filter((p: unknown): p is string => typeof p === "string" && p.trim() !== "").map((p: string) => p.trim())
    : [];
  const makeScenarioId = body.makeScenarioId === null || body.makeScenarioId === undefined || body.makeScenarioId === "" ? null : Number(body.makeScenarioId);
  const remarques = typeof body.remarques === "string" ? body.remarques.trim() || null : null;

  let boite;
  try {
    boite = await prisma.boiteMailTiersPayant.create({
      data: { nom, email, plateformes, makeScenarioId, remarques },
    });
  } catch (erreur: unknown) {
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002") {
      return NextResponse.json({ erreur: "Cette adresse mail est déjà enregistrée." }, { status: 409 });
    }
    throw erreur;
  }

  await journaliser({
    type: "boite-mail-tiers-payant.creee",
    entite: "BoiteMailTiersPayant",
    entiteId: boite.id,
    acteur: session?.email,
    donnees: { nom, email, plateformes },
  });

  return NextResponse.json(boite, { status: 201 });
}
