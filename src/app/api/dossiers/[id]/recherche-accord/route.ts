import { NextRequest, NextResponse } from "next/server";
import { lireSession } from "@/lib/auth";
import { declencherRechercheAccordMutuelle } from "@/lib/rechercheAccordMutuelle";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/dossiers/:id/recherche-accord — bouton "🔍 Relancer la
 * recherche" affiché en face d'une demande refusée (ou en attente), et
 * commande vocale équivalente (voir lib/assistantVocal.ts). Ne fait pas de
 * recherche synchrone dans une boîte mail (ce logiciel ne s'y connecte pas
 * directement — voir /api/automatisations/accord-mutuelle-entrant et
 * lib/traitementMailAccordMutuelle.ts) : déclenche une exécution immédiate
 * du/des scénario(s) Make qui surveillent les boîtes mail concernées,
 * au lieu d'attendre leur prochain passage planifié — voir
 * lib/rechercheAccordMutuelle.ts pour la logique partagée.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;

  const resultat = await declencherRechercheAccordMutuelle(id, session?.email);
  if (!resultat.ok) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.status });
  }
  return NextResponse.json({ declenche: resultat.declenche, resultats: resultat.resultats });
}
