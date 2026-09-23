import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { soldeRestant, statutApresEncaissement } from "@/lib/facturation";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/factures/:id/paiements — enregistre un encaissement.
 * "Chaque encaissement est un événement daté, jamais une simple mise à jour
 * d'un solde" (dossier-cadrage) : append-only, jamais modifié après coup.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: factureId } = await params;
  const body = await request.json();

  const montantTTC = Number.isInteger(body.montantTTC) ? body.montantTTC : NaN;
  if (!Number.isInteger(montantTTC) || montantTTC <= 0) {
    return NextResponse.json({ erreur: "montantTTC (en centimes, entier strictement positif) requis." }, { status: 400 });
  }
  const moyen = typeof body.moyen === "string" ? body.moyen.trim() || null : null;

  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { paiements: true, avoirs: true },
  });
  if (!facture) {
    return NextResponse.json({ erreur: "Facture introuvable." }, { status: 404 });
  }
  if (facture.statut === "SOLDEE") {
    return NextResponse.json({ erreur: "Cette facture est déjà soldée." }, { status: 409 });
  }

  const [paiement, mise_a_jour] = await prisma.$transaction(async (tx) => {
    const p = await tx.paiement.create({ data: { factureId, montantTTC, moyen } });
    const paiements = [...facture.paiements, p];
    const statut = statutApresEncaissement(facture, paiements, facture.avoirs);
    const f = await tx.facture.update({ where: { id: factureId }, data: { statut } });
    return [p, f];
  });

  await journaliser({
    type: "facture.paiement_encaisse",
    entite: "Paiement",
    entiteId: paiement.id,
    personneId: facture.personneId,
    acteur: session?.email,
    donnees: { montantTTC, moyen, statutFacture: mise_a_jour.statut },
  });

  return NextResponse.json(
    { paiement, facture: mise_a_jour, soldeRestant: soldeRestant(mise_a_jour, [...facture.paiements, paiement], facture.avoirs) },
    { status: 201 },
  );
}
