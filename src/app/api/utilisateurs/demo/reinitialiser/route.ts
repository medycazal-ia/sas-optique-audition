import { NextResponse } from "next/server";
import { lireSession, sessionEstDirecteurOuPlus } from "@/lib/auth";
import { reinitialiserDonneesDemo } from "@/lib/demo";

/**
 * POST /api/utilisateurs/demo/reinitialiser — supprime pour de bon tout ce
 * qui a été créé sous les comptes démo (dossiers d'exemple + tout ce qu'un
 * compte démo a pu créer depuis). Les comptes démo eux-mêmes restent, prêts
 * à être réutilisés au prochain amorçage.
 */
export async function POST() {
  const session = await lireSession();
  if (!sessionEstDirecteurOuPlus(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }

  const { dossiersSupprimes } = await reinitialiserDonneesDemo();

  return NextResponse.json({ dossiersSupprimes });
}
