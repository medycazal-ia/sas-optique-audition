import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

const RESULTATS_MAX = 20;

/**
 * GET /api/dossiers?q=... — recherche de dossiers (Personne).
 *
 * Volontairement PAS de liste par défaut : au comptoir, avec des centaines de
 * dossiers, une liste complète n'est jamais utile — seule la recherche l'est.
 * Sans `q` (ou `q` vide), on renvoie donc une liste vide plutôt que tout
 * charger. `q` est comparé en préfixe (insensible à la casse) sur nom,
 * prénom et numéro de sécurité sociale — une seule recherche couvre les
 * trois cas (nom seul, prénom seul, NSS seul).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json([]);
  }

  const personnes = await prisma.personne.findMany({
    where: {
      OR: [
        { nom: { startsWith: q, mode: "insensitive" } },
        { prenom: { startsWith: q, mode: "insensitive" } },
        { numeroSecuriteSociale: { startsWith: q } },
      ],
    },
    orderBy: { nom: "asc" },
    take: RESULTATS_MAX,
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

  const numeroSecuriteSociale =
    typeof body.numeroSecuriteSociale === "string" ? body.numeroSecuriteSociale.trim() || null : null;

  const personne = await prisma.personne.create({
    data: {
      prenom,
      nom,
      telephone,
      email,
      numeroSecuriteSociale,
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
