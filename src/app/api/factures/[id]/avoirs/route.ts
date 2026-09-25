import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { soldeRestant, statutApresEncaissement } from "@/lib/facturation";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/factures/:id/avoirs — "Un avoir reste lié à la facture d'origine
 * — jamais un document indépendant" (critère d'acceptation V1) : structurel
 * ici (toujours créé sous une Facture existante), jamais un modèle à part.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: factureId } = await params;
  const body = await request.json();

  const montantTTC = Number.isInteger(body.montantTTC) ? body.montantTTC : NaN;
  if (!Number.isInteger(montantTTC) || montantTTC <= 0) {
    return NextResponse.json({ erreur: "montantTTC (en centimes, entier strictement positif) requis." }, { status: 400 });
  }
  const motif = typeof body.motif === "string" ? body.motif.trim() || null : null;

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

  const [avoir, mise_a_jour] = await prisma.$transaction(async (tx) => {
    const a = await tx.avoir.create({ data: { factureId, montantTTC, motif } });
    const avoirs = [...facture.avoirs, a];
    const statut = statutApresEncaissement(facture, facture.paiements, avoirs);
    const f = await tx.facture.update({ where: { id: factureId }, data: { statut } });
    return [a, f];
  });

  await journaliser({
    type: "facture.avoir_emis",
    entite: "Avoir",
    entiteId: avoir.id,
    personneId: facture.personneId,
    acteur: session?.email,
    donnees: { montantTTC, motif, statutFacture: mise_a_jour.statut },
  });

  return NextResponse.json(
    { avoir, facture: mise_a_jour, soldeRestant: soldeRestant(mise_a_jour, facture.paiements, [...facture.avoirs, avoir]) },
    { status: 201 },
  );
}
