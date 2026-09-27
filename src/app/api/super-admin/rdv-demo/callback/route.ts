import { NextRequest, NextResponse } from "next/server";
import { lireSession } from "@/lib/auth";
import { finaliserConnexionGoogle } from "@/lib/googleCalendarRdv";

/**
 * GET /api/super-admin/rdv-demo/callback — retour de Google après consentement
 * (voir .../autoriser/route.ts). Protégée par le préfixe /api/super-admin du
 * proxy : le navigateur qui revient de Google porte toujours le cookie de
 * session du super admin qui a démarré la connexion.
 */
export async function GET(request: NextRequest) {
  const session = await lireSession();
  const code = request.nextUrl.searchParams.get("code");
  const erreurGoogle = request.nextUrl.searchParams.get("error");
  const urlRetour = new URL("/super-admin/rdv-demo", request.nextUrl.origin);

  if (erreurGoogle) {
    urlRetour.searchParams.set("erreur", erreurGoogle);
    return NextResponse.redirect(urlRetour);
  }
  if (!code) {
    urlRetour.searchParams.set("erreur", "code_manquant");
    return NextResponse.redirect(urlRetour);
  }

  try {
    const redirectUri = new URL("/api/super-admin/rdv-demo/callback", request.nextUrl.origin).toString();
    await finaliserConnexionGoogle(code, redirectUri, session?.email ?? "inconnu");
    urlRetour.searchParams.set("connecte", "1");
  } catch (e) {
    urlRetour.searchParams.set("erreur", e instanceof Error ? e.message : "echec_inconnu");
  }
  return NextResponse.redirect(urlRetour);
}
