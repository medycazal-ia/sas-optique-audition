import { NextRequest, NextResponse } from "next/server";
import { lireSession } from "@/lib/auth";
import { executerActionConfirmee } from "@/lib/assistantVocal";

/**
 * POST /api/assistant-vocal/executer — exécute une action de l'assistant
 * vocal après confirmation explicite de l'utilisateur (voir
 * components/AssistantVocal.tsx). Séparée de /api/assistant-vocal : cette
 * route est la SEULE capable de modifier des données depuis l'assistant
 * vocal, jamais l'interprétation initiale de la commande.
 */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";
  if (!action) {
    return NextResponse.json({ erreur: "Action manquante." }, { status: 400 });
  }

  try {
    const resultat = await executerActionConfirmee(action, body?.parametres, session.email);
    return NextResponse.json(resultat);
  } catch (e) {
    console.error("assistant-vocal/executer — erreur :", e);
    return NextResponse.json({ erreur: e instanceof Error ? e.message : "Erreur inattendue." }, { status: 500 });
  }
}
