import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifierMotDePasse, creerSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const motDePasse = typeof body.motDePasse === "string" ? body.motDePasse : "";

  if (!email || !motDePasse) {
    return NextResponse.json({ erreur: "Email et mot de passe requis." }, { status: 400 });
  }

  const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });

  // Message volontairement identique que l'email existe ou non, pour ne pas
  // révéler quels comptes existent.
  if (!utilisateur || !utilisateur.actif || !(await verifierMotDePasse(motDePasse, utilisateur.motDePasseHash))) {
    return NextResponse.json({ erreur: "Identifiants incorrects." }, { status: 401 });
  }

  await creerSession({
    id: utilisateur.id,
    email: utilisateur.email,
    nom: utilisateur.nom,
    role: utilisateur.role,
  });

  await prisma.utilisateur.update({
    where: { id: utilisateur.id },
    data: { derniereConnexionA: new Date() },
  });

  return NextResponse.json({ id: utilisateur.id, email: utilisateur.email, nom: utilisateur.nom });
}
