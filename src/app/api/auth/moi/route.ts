import { NextRequest, NextResponse } from "next/server";
import { lireSession, creerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { modifierMonProfil, ErreurUtilisateur } from "@/lib/utilisateurs";

export async function GET() {
  const session = await lireSession();
  if (!session) {
    const amorceRequise = (await prisma.utilisateur.count()) === 0;
    return NextResponse.json({ session: null, amorceRequise });
  }

  // Diagnostic Super Admin — jamais la liste elle-même (pas de fuite), juste
  // de quoi savoir si SUPER_ADMIN_EMAILS est bien réglé côté serveur et si
  // l'email de la session s'y trouve. Utile pour déboguer une variable
  // Render mal reconnue sans avoir à deviner.
  const brut = process.env.SUPER_ADMIN_EMAILS ?? "";
  const liste = brut
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const superAdminEmailsConfigure = liste.length > 0;
  const monEmailEstDansLaListe = liste.includes(session.email.trim().toLowerCase());

  const profil = await prisma.utilisateur.findUnique({
    where: { id: session.id },
    select: { prenom: true, telephonePerso: true, pseudo: true },
  });

  return NextResponse.json({
    session,
    profil,
    diagnosticSuperAdmin: { superAdminEmailsConfigure, monEmailEstDansLaListe },
  });
}

/**
 * PATCH /api/auth/moi — édition de son propre profil, accessible à tout
 * compte connecté (collaborateur compris) sans passer par un directeur.
 * Réémet aussitôt le cookie de session avec le nom/email à jour, pour ne
 * pas avoir à se reconnecter pour les voir reflétés (rôle inchangé, seul un
 * directeur peut le modifier).
 */
export async function PATCH(request: NextRequest) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    const utilisateur = await modifierMonProfil(session, body);
    await creerSession({ id: utilisateur.id, email: utilisateur.email, nom: utilisateur.nom, role: session.role });
    return NextResponse.json(utilisateur);
  } catch (e) {
    if (e instanceof ErreurUtilisateur) {
      return NextResponse.json({ erreur: e.message }, { status: e.statut });
    }
    throw e;
  }
}
