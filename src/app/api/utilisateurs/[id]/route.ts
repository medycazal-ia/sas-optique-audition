import { NextRequest, NextResponse } from "next/server";
import { lireSession, sessionEstDirecteurOuPlus } from "@/lib/auth";
import { modifierUtilisateur, ErreurUtilisateur } from "@/lib/utilisateurs";

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/utilisateurs/:id — édition de profil (carte Utilisateurs). */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!sessionEstDirecteurOuPlus(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const utilisateur = await modifierUtilisateur(id, body, false);
    return NextResponse.json(utilisateur);
  } catch (e) {
    if (e instanceof ErreurUtilisateur) {
      return NextResponse.json({ erreur: e.message }, { status: e.statut });
    }
    throw e;
  }
}
