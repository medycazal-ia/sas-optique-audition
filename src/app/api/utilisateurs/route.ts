import { NextRequest, NextResponse } from "next/server";
import { lireSession, sessionEstDirecteurOuPlus } from "@/lib/auth";
import { listerUtilisateurs, creerUtilisateur, ErreurUtilisateur } from "@/lib/utilisateurs";

/**
 * GET/POST /api/utilisateurs — carte Utilisateurs (rôle DIRECTEUR et
 * au-dessus). Ne renvoie et ne crée jamais de compte SUPER_ADMIN — voir
 * src/lib/utilisateurs.ts.
 */
export async function GET() {
  const session = await lireSession();
  if (!sessionEstDirecteurOuPlus(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const utilisateurs = await listerUtilisateurs(false);
  return NextResponse.json(utilisateurs);
}

export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!sessionEstDirecteurOuPlus(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
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
