import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ code: string }> };

/**
 * GET /api/paiements/:code — retrouve la demande de prise en charge portant
 * ce code paiement (voir lib/codePaiement.ts), avec de quoi l'afficher :
 * dossier, mutuelle concernée, montant, statut de réception.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { code } = await params;
  const demande = await prisma.demandePriseEnCharge.findUnique({
    where: { codePaiement: code },
    include: { proposition: { include: { personne: { select: { prenom: true, nom: true, mutuelleNom: true, mutuelle2Nom: true } } } } },
  });
  if (!demande) {
    return NextResponse.json({ erreur: "Code paiement introuvable." }, { status: 404 });
  }

  const mutuelleNom = demande.rang === "SECONDAIRE" ? demande.proposition.personne.mutuelle2Nom : demande.proposition.personne.mutuelleNom;

  return NextResponse.json({
    id: demande.id,
    rang: demande.rang,
    statut: demande.statut,
    montantPriseEnChargeTTC: demande.montantPriseEnChargeTTC,
    recuLeA: demande.recuLeA,
    recuPar: demande.recuPar,
    mutuelleNom,
    personne: { prenom: demande.proposition.personne.prenom, nom: demande.proposition.personne.nom },
  });
}

/**
 * POST /api/paiements/:code — marque le montant comme reçu de la mutuelle
 * (ou de la caution client en attendant son remboursement) — le "pseudo
 * tiers payant" : un simple rapprochement, jamais un mouvement d'argent
 * réel déclenché par le logiciel. Idempotent : renvoie l'état déjà reçu
 * sans erreur si rejoué (ex. un même QR scanné deux fois).
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { code } = await params;

  const demande = await prisma.demandePriseEnCharge.findUnique({ where: { codePaiement: code } });
  if (!demande) {
    return NextResponse.json({ erreur: "Code paiement introuvable." }, { status: 404 });
  }

  if (demande.recuLeA) {
    return NextResponse.json(demande);
  }

  const mise_a_jour = await prisma.demandePriseEnCharge.update({
    where: { id: demande.id },
    data: { recuLeA: new Date(), recuPar: session?.email ?? null },
  });

  await journaliser({
    type: "demande-mutuelle.paiement_recu",
    entite: "DemandePriseEnCharge",
    entiteId: demande.id,
    personneId: demande.personneId,
    acteur: session?.email,
  });

  return NextResponse.json(mise_a_jour);
}
