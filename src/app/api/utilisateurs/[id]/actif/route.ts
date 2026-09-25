import { NextRequest, NextResponse } from "next/server";
import { lireSession, sessionEstDirecteurOuPlus } from "@/lib/auth";
import { basculerActif, ErreurUtilisateur } from "@/lib/utilisateurs";

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/utilisateurs/:id/actif — bascule actif/inactif (carte Utilisateurs). */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!session || !sessionEstDirecteurOuPlus(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const actif = Boolean(body.actif);
  try {
    const utilisateur = await basculerActif(id, actif, session, false);
    return NextResponse.json(utilisateur);
  } catch (e) {
    if (e instanceof ErreurUtilisateur) {
      return NextResponse.json({ erreur: e.message }, { status: e.statut });
    }
    throw e;
  }
}
