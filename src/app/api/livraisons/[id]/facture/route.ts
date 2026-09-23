import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/livraisons/:id/facture — émission de facture à partir d'une
 * livraison clôturée. "Une facture reprend automatiquement le reste à
 * charge validé par le module Mutuelle — aucun recalcul manuel" (critère
 * d'acceptation V1) : le montant est figé ici, une bonne fois, à partir de
 * Proposition.resteAChargeTTC (accord mutuelle) ou du total de la
 * proposition si aucune mutuelle n'est intervenue (refusée ou sans objet).
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: livraisonId } = await params;

  const livraison = await prisma.livraison.findUnique({
    where: { id: livraisonId },
    include: {
      facture: true,
      commande: { include: { proposition: { include: { lignes: true } } } },
    },
  });
  if (!livraison) {
    return NextResponse.json({ erreur: "Livraison introuvable." }, { status: 404 });
  }
  if (livraison.statut !== "CLOTUREE") {
    return NextResponse.json({ erreur: "Seule une livraison clôturée peut être facturée." }, { status: 409 });
  }
  if (livraison.facture) {
    return NextResponse.json({ erreur: "Cette livraison a déjà une facture." }, { status: 409 });
  }

  const proposition = livraison.commande.proposition;
  if (!proposition) {
    return NextResponse.json(
      { erreur: "Cette livraison est issue d'un remplacement SAV, sans proposition associée — pas de facturation automatique possible ici." },
      { status: 409 },
    );
  }
  const totalProposition = proposition.lignes.reduce((s, l) => s + l.prixUnitaireTTC * l.quantite, 0);
  const montantTTC = proposition.resteAChargeTTC ?? totalProposition;

  const facture = await prisma.facture.create({
    data: { livraisonId, personneId: livraison.personneId, montantTTC },
    include: { paiements: true, avoirs: true },
  });

  await journaliser({
    type: "facture.emise",
    entite: "Facture",
    entiteId: facture.id,
    personneId: livraison.personneId,
    acteur: session?.email,
    donnees: { montantTTC, resteAChargeUtilise: proposition.resteAChargeTTC !== null },
  });

  return NextResponse.json(facture, { status: 201 });
}
