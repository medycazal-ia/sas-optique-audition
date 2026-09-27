import { NextRequest, NextResponse } from "next/server";
import { reserverCreneau } from "@/lib/googleCalendarRdv";

/**
 * POST /api/rdv-demo/reserver — public : réserve un créneau de démo (voir
 * app/rdv-demo/page.tsx). Revalide la disponibilité côté serveur avant de
 * créer l'événement (voir lib/googleCalendarRdv.ts) — jamais de confiance
 * aveugle dans les créneaux affichés côté client, qui peuvent être obsolètes
 * de quelques secondes/minutes.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { debut, fin, prenom, nom, email, telephone, message } = body ?? {};

  if (!debut || !fin || !prenom?.trim() || !nom?.trim() || !email?.trim()) {
    return NextResponse.json({ erreur: "Créneau, prénom, nom et email sont requis." }, { status: 400 });
  }

  try {
    const evenement = await reserverCreneau({
      debut,
      fin,
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim(),
      telephone: telephone?.trim() || undefined,
      message: message?.trim() || undefined,
    });
    return NextResponse.json({ ok: true, evenement });
  } catch (e) {
    return NextResponse.json({ erreur: e instanceof Error ? e.message : "Erreur inconnue." }, { status: 409 });
  }
}
