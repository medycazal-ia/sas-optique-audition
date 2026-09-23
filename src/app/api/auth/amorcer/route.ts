import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hacherMotDePasse, creerSession } from "@/lib/auth";

/**
 * POST /api/auth/amorcer — crée le tout premier compte (ADMIN), uniquement
 * s'il n'existe encore aucun utilisateur. Ferme la porte dès qu'un compte
 * existe : plus jamais accessible ensuite, pas de risque de créer un admin
 * supplémentaire sans authentification derrière ce endpoint.
 */
export async function POST(request: NextRequest) {
  const nbExistants = await prisma.utilisateur.count();
  if (nbExistants > 0) {
    return NextResponse.json(
      { erreur: "Un compte existe déjà — utilisez la page de connexion." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  const motDePasse = typeof body.motDePasse === "string" ? body.motDePasse : "";

  if (!email || !email.includes("@") || !nom || motDePasse.length < 8) {
    return NextResponse.json(
      { erreur: "Email valide, nom, et mot de passe d'au moins 8 caractères requis." },
      { status: 400 },
    );
  }

  const utilisateur = await prisma.utilisateur.create({
    data: {
      email,
      nom,
      motDePasseHash: await hacherMotDePasse(motDePasse),
      role: "ADMIN",
    },
  });

  await creerSession({ id: utilisateur.id, email: utilisateur.email, nom: utilisateur.nom, role: utilisateur.role });

  return NextResponse.json({ id: utilisateur.id, email: utilisateur.email }, { status: 201 });
}
