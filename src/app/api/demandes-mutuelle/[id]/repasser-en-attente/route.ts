import { NextRequest, NextResponse } from "next/server";
import { lireSession } from "@/lib/auth";
import { repasserDemandeEnAttente } from "@/lib/repasserEnAttente";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/demandes-mutuelle/:id/repasser-en-attente — bouton affiché en
 * face d'une demande refusée, et commande vocale équivalente (voir
 * lib/assistantVocal.ts). Voir lib/repasserEnAttente.ts pour la logique
 * partagée et les règles (uniquement depuis REFUS).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;

  const resultat = await repasserDemandeEnAttente(id, session?.email);
  if (!resultat.ok) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.status });
  }
  return NextResponse.json(resultat.demande);
}
