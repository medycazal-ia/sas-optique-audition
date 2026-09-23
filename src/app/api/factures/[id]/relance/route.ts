import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { factureEnRetard, soldeRestant } from "@/lib/facturation";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/factures/:id/relance — trace l'envoi d'une relance sur une
 * facture impayée après délai. "Un impayé après délai génère une tâche de
 * relance visible" (critère d'acceptation V1) : ce module ne fait rien
 * d'automatisé pour l'instant (Automatisations n'existe pas encore), il
 * trace juste l'action humaine.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: factureId } = await params;

  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { paiements: true, avoirs: true },
  });
  if (!facture) {
    return NextResponse.json({ erreur: "Facture introuvable." }, { status: 404 });
  }

  const solde = soldeRestant(facture, facture.paiements, facture.avoirs);
  if (!factureEnRetard(facture, solde)) {
    return NextResponse.json({ erreur: "Cette facture n'est pas en retard de paiement." }, { status: 409 });
  }

  const mise_a_jour = await prisma.facture.update({ where: { id: factureId }, data: { relanceEnvoyeeA: new Date() } });

  await journaliser({
    type: "facture.relance_envoyee",
    entite: "Facture",
    entiteId: factureId,
    personneId: facture.personneId,
    acteur: session?.email,
  });

  return NextResponse.json(mise_a_jour);
}
