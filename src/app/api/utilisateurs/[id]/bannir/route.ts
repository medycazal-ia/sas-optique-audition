import { NextRequest, NextResponse } from "next/server";
import { lireSession, sessionEstDirecteurOuPlus } from "@/lib/auth";
import { bannirUtilisateur, ErreurUtilisateur } from "@/lib/utilisateurs";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/utilisateurs/:id/bannir — bannissement définitif (carte
 * Utilisateurs). Aucune route symétrique de débannissement : une fois posé,
 * ce blocage n'est jamais rétabli (décision du fondateur) — les données et
 * l'historique du compte restent consultables normalement.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!session || !sessionEstDirecteurOuPlus(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const motif = typeof body.motif === "string" ? body.motif : "";
  try {
    const utilisateur = await bannirUtilisateur(id, motif, session, false);
    return NextResponse.json(utilisateur);
  } catch (e) {
    if (e instanceof ErreurUtilisateur) {
      return NextResponse.json({ erreur: e.message }, { status: e.statut });
    }
    throw e;
  }
}
