import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/demandes-mutuelle/:id/reponse — envoyée/en attente → accord/refus.
 *
 * Critère d'acceptation V1 du module : "Aucun reste à charge n'est communiqué
 * au client sans mutuelle renseignée et vérifiée (ou refus explicite du
 * client de la renseigner, tracé comme tel)." Un accord — qui produit
 * justement ce reste à charge — est donc refusé (409) tant que le dossier
 * n'a ni mutuelle renseignée ni refus explicite tracé.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const decision = body.decision;
  if (decision !== "ACCORD" && decision !== "REFUS") {
    return NextResponse.json({ erreur: "decision doit être ACCORD ou REFUS." }, { status: 400 });
  }

  const demande = await prisma.demandePriseEnCharge.findUnique({
    where: { id },
    include: { proposition: { include: { lignes: true } } },
  });
  if (!demande) {
    return NextResponse.json({ erreur: "Demande introuvable." }, { status: 404 });
  }
  if (demande.statut !== "ENVOYEE" && demande.statut !== "EN_ATTENTE") {
    return NextResponse.json(
      { erreur: "Seule une demande envoyée ou en attente peut recevoir une réponse." },
      { status: 409 },
    );
  }

  if (decision === "ACCORD") {
    const personne = await prisma.personne.findUnique({ where: { id: demande.personneId } });
    if (!personne?.mutuelleNom && !personne?.mutuelleRefuseeA) {
      return NextResponse.json(
        {
          erreur:
            "Mutuelle non renseignée sur le dossier — impossible de communiquer un reste à charge sans mutuelle renseignée ou refus explicite tracé.",
        },
        { status: 409 },
      );
    }

    const montant = Number.isInteger(body.montantPriseEnChargeTTC) ? body.montantPriseEnChargeTTC : NaN;
    if (!Number.isInteger(montant) || montant < 0) {
      return NextResponse.json(
        { erreur: "montantPriseEnChargeTTC (en centimes, entier positif ou nul) requis." },
        { status: 400 },
      );
    }

    const totalProposition = demande.proposition.lignes.reduce((s, l) => s + l.prixUnitaireTTC * l.quantite, 0);
    const resteAChargeTTC = Math.max(0, totalProposition - montant);

    const [mise_a_jour] = await prisma.$transaction([
      prisma.demandePriseEnCharge.update({
        where: { id },
        data: { statut: "ACCORD", reponseA: new Date(), montantPriseEnChargeTTC: montant },
      }),
      prisma.proposition.update({ where: { id: demande.propositionId }, data: { resteAChargeTTC } }),
    ]);

    await journaliser({
      type: "demande-mutuelle.accord",
      entite: "DemandePriseEnCharge",
      entiteId: id,
      personneId: demande.personneId,
      acteur: session?.email,
      donnees: { montantPriseEnChargeTTC: montant, resteAChargeTTC },
    });

    return NextResponse.json(mise_a_jour);
  }

  const motifRefus = typeof body.motifRefus === "string" ? body.motifRefus.trim() || null : null;
  const mise_a_jour = await prisma.demandePriseEnCharge.update({
    where: { id },
    data: { statut: "REFUS", reponseA: new Date(), motifRefus },
  });

  await journaliser({
    type: "demande-mutuelle.refus",
    entite: "DemandePriseEnCharge",
    entiteId: id,
    personneId: demande.personneId,
    acteur: session?.email,
    donnees: { motifRefus },
  });

  return NextResponse.json(mise_a_jour);
}
