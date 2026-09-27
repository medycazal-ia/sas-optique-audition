import { NextRequest, NextResponse } from "next/server";
import { lireSession } from "@/lib/auth";
import { interpreterCommandeVocale } from "@/lib/assistantVocal";

/**
 * POST /api/assistant-vocal — reçoit le texte déjà transcrit (par la
 * reconnaissance vocale du navigateur, voir components/AssistantVocal.tsx)
 * d'une commande dite au micro, et renvoie l'action à effectuer.
 */
export async function POST(request: NextRequest) {
  const session = await lireSession();
  if (!session) {
    return NextResponse.json({ erreur: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const texte = typeof body?.texte === "string" ? body.texte.trim() : "";
  if (!texte) {
    return NextResponse.json({ erreur: "Texte de commande manquant." }, { status: 400 });
  }

  try {
    const resultat = await interpreterCommandeVocale(texte);
    return NextResponse.json(resultat);
  } catch (e) {
    console.error("assistant-vocal — erreur :", e);
    return NextResponse.json({ erreur: e instanceof Error ? e.message : "Erreur inattendue." }, { status: 500 });
  }
}
