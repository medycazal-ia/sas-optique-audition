import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/demandes-mutuelle/:id/repasser-en-attente — bouton affiché en
 * face d'une demande refusée, pour la remettre en attente (par exemple si
 * le refus était erroné, ou pour permettre à un nouveau mail de la mutuelle
 * — accord ultérieur, appel du refus — de la mettre à jour automatiquement
 * via traiterMailAccordMutuelle, qui n'agit jamais sur une demande déjà
 * tranchée). Uniquement depuis REFUS : une demande déjà en ACCORD ne se
 * rouvre pas d'un clic (impact facturation/reste à charge déjà communiqué).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;

  const demande = await prisma.demandePriseEnCharge.findUnique({ where: { id } });
  if (!demande) {
    return NextResponse.json({ erreur: "Demande introuvable." }, { status: 404 });
  }
  if (demande.statut !== "REFUS") {
    return NextResponse.json(
      { erreur: "Seule une demande refusée peut être remise en attente." },
      { status: 409 },
    );
  }

  const mise_a_jour = await prisma.demandePriseEnCharge.update({
    where: { id },
    data: { statut: "EN_ATTENTE", reponseA: null, motifRefus: null },
  });

  await journaliser({
    type: "demande-mutuelle.repassee_en_attente",
    entite: "DemandePriseEnCharge",
    entiteId: id,
    personneId: demande.personneId,
    acteur: session?.email,
    donnees: {},
  });

  return NextResponse.json(mise_a_jour);
}
