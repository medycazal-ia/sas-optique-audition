import { NextResponse } from "next/server";
import { lireSession, sessionEstDirecteurOuPlus } from "@/lib/auth";
import { amorcerDonneesDemo, IDENTIFIANTS_DEMO } from "@/lib/demo";

/**
 * POST /api/utilisateurs/demo — crée (ou remet à un état connu) les comptes
 * démo directeur/collaborateur + quelques dossiers d'exemple. Toujours
 * les mêmes identifiants, ré-exécutable sans risque avant chaque
 * présentation.
 */
export async function POST() {
  const session = await lireSession();
  if (!sessionEstDirecteurOuPlus(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }

  const { dossiersCrees } = await amorcerDonneesDemo();

  return NextResponse.json({ identifiants: IDENTIFIANTS_DEMO, dossiersCrees });
}
