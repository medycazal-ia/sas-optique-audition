import { NextRequest, NextResponse } from "next/server";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";
import { listerUtilisateurs, creerUtilisateur, ErreurUtilisateur } from "@/lib/utilisateurs";

/**
 * GET/POST /api/super-admin/utilisateurs — carte Super Admin uniquement.
 * Contrairement à /api/utilisateurs, voit et gère TOUT le monde, y compris
 * les comptes DIRECTEUR. Ne crée jamais de compte SUPER_ADMIN pour autant —
 * voir src/lib/utilisateurs.ts : ce rôle ne s'attribue jamais depuis
 * l'application, ici y compris.
 */
export async function GET() {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non trouvé." }, { status: 404 });
  }
  const utilisateurs = await listerUtilisateurs(true);
  return NextResponse.json(utilisateurs);
}

export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non trouvé." }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    const utilisateur = await creerUtilisateur(body);
    return NextResponse.json(utilisateur, { status: 201 });
  } catch (e) {
    if (e instanceof ErreurUtilisateur) {
      return NextResponse.json({ erreur: e.message }, { status: e.statut });
    }
    throw e;
  }
}
