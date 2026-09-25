import { NextResponse } from "next/server";
import { lireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  return NextResponse.json({
    session,
    diagnosticSuperAdmin: { superAdminEmailsConfigure, monEmailEstDansLaListe },
  });
}
