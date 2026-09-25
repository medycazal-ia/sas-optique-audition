import { NextRequest, NextResponse } from "next/server";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";
import { bannirUtilisateur, ErreurUtilisateur } from "@/lib/utilisateurs";

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/super-admin/utilisateurs/:id/bannir — bannissement définitif, tout le monde. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!session || !sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non trouvé." }, { status: 404 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const motif = typeof body.motif === "string" ? body.motif : "";
  try {
    const utilisateur = await bannirUtilisateur(id, motif, session, true);
    return NextResponse.json(utilisateur);
  } catch (e) {
    if (e instanceof ErreurUtilisateur) {
      return NextResponse.json({ erreur: e.message }, { status: e.statut });
    }
    throw e;
  }
}
