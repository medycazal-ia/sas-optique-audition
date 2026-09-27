import { NextResponse } from "next/server";
import { urlAutorisationGoogle, redirectUriGoogleCalendar } from "@/lib/googleCalendarRdv";

/**
 * GET /api/super-admin/rdv-demo/autoriser — lance la connexion OAuth2 de
 * l'agenda Google du fondateur (bouton "Connecter Google Calendar", carte
 * Super Admin > Prise de RDV). Protégée par le préfixe /api/super-admin du
 * proxy (src/proxy.ts) : seul un super admin authentifié l'atteint.
 */
export async function GET() {
  const url = urlAutorisationGoogle(redirectUriGoogleCalendar());
  if (!url) {
    return NextResponse.json(
      { erreur: "GOOGLE_CALENDAR_CLIENT_ID n'est pas configuré — voir render.yaml." },
      { status: 409 },
    );
  }
  return NextResponse.redirect(url);
}
