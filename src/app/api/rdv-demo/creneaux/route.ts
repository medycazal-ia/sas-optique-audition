import { NextResponse } from "next/server";
import { creneauxDisponibles } from "@/lib/googleCalendarRdv";

/**
 * GET /api/rdv-demo/creneaux — public : liste des créneaux disponibles pour
 * la prise de RDV démo (voir app/rdv-demo/page.tsx). Renvoie un tableau
 * vide (pas une erreur) tant que l'agenda n'est pas connecté côté Super
 * Admin — la page affiche alors son message de repli.
 */
export async function GET() {
  try {
    const creneaux = await creneauxDisponibles();
    return NextResponse.json({ creneaux });
  } catch (e) {
    return NextResponse.json(
      { creneaux: [], erreur: e instanceof Error ? e.message : "Erreur inconnue." },
      { status: 200 },
    );
  }
}
