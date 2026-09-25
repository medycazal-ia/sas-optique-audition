import { NextRequest, NextResponse } from "next/server";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";
import { modifierUtilisateur, ErreurUtilisateur } from "@/lib/utilisateurs";

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/super-admin/utilisateurs/:id — édition de profil (carte Super Admin, tout le monde). */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non trouvé." }, { status: 404 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const utilisateur = await modifierUtilisateur(id, body, true);
    return NextResponse.json(utilisateur);
  } catch (e) {
    if (e instanceof ErreurUtilisateur) {
      return NextResponse.json({ erreur: e.message }, { status: e.statut });
    }
    throw e;
  }
}
