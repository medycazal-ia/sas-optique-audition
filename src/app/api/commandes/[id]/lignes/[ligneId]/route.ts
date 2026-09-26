import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { validerCorrectionVerre } from "@/lib/correctionVerre";

type RouteParams = { params: Promise<{ id: string; ligneId: string }> };

/**
 * PATCH /api/commandes/:id/lignes/:ligneId — corrige la correction optique
 * (catégorie VERRE) d'une ligne de commande, reprise sur la facture. Comme
 * pour PropositionLigne, modifiable quel que soit le statut de la commande
 * — pas un engagement commercial mais une donnée factuelle.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: commandeId, ligneId } = await params;
  const body = await request.json().catch(() => ({}));

  const commande = await prisma.commande.findUnique({ where: { id: commandeId } });
  if (!commande) {
    return NextResponse.json({ erreur: "Commande introuvable." }, { status: 404 });
  }
  const ligne = await prisma.commandeLigne.findUnique({ where: { id: ligneId } });
  if (!ligne || ligne.commandeId !== commandeId) {
    return NextResponse.json({ erreur: "Ligne introuvable." }, { status: 404 });
  }

  const correction = validerCorrectionVerre(body);
  const ligneMaj = await prisma.commandeLigne.update({ where: { id: ligneId }, data: correction });

  await journaliser({
    type: "commande.ligne_correction_modifiee",
    entite: "CommandeLigne",
    entiteId: ligneId,
    personneId: commande.personneId,
    acteur: session?.email,
    donnees: correction,
  });

  return NextResponse.json(ligneMaj);
}
