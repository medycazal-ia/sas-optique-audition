import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

/**
 * GET /api/dossiers — liste des dossiers (Personne), les plus récents d'abord.
 */
export async function GET() {
  const personnes = await prisma.personne.findMany({
    orderBy: { creeA: "desc" },
    include: {
      _count: { select: { documents: true, ordonnances: true } },
    },
  });
  return NextResponse.json(personnes);
}

/**
 * POST /api/dossiers — créer un dossier avec le strict minimum requis au
 * comptoir. Critère d'acceptation V1 : "un dossier peut être créé en moins de
 * 2 minutes avec le strict minimum (identité + contact)".
 */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  const body = await request.json();

  const prenom = typeof body.prenom === "string" ? body.prenom.trim() : "";
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";

  if (!prenom || !nom) {
    return NextResponse.json(
      { erreur: "Prénom et nom sont requis pour créer un dossier." },
      { status: 400 },
    );
  }

  const telephone = typeof body.telephone === "string" ? body.telephone.trim() || null : null;
  const email = typeof body.email === "string" ? body.email.trim() || null : null;

  if (!telephone && !email) {
    return NextResponse.json(
      { erreur: "Au moins un moyen de contact (téléphone ou email) est requis." },
      { status: 400 },
    );
  }

  const personne = await prisma.personne.create({
    data: {
      prenom,
      nom,
      telephone,
      email,
      civilite: typeof body.civilite === "string" ? body.civilite : null,
      dateNaissance: body.dateNaissance ? new Date(body.dateNaissance) : null,
    },
  });

  await journaliser({
    type: "personne.creee",
    entite: "Personne",
    entiteId: personne.id,
    personneId: personne.id,
    acteur: session?.email,
    donnees: { prenom, nom },
  });

  return NextResponse.json(personne, { status: 201 });
}
