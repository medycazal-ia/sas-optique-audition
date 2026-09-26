import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genererAccordTiersPayantPdf } from "@/lib/accordTiersPayantPdf";
import { modeleActif } from "@/lib/modelesDocuments";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/demandes-mutuelle/:id/formulaire — document imprimable de
 * l'accord/refus de prise en charge (voir lib/accordTiersPayantPdf.ts),
 * disponible une fois la réponse de la mutuelle enregistrée.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const demande = await prisma.demandePriseEnCharge.findUnique({ where: { id } });
  if (!demande) {
    return NextResponse.json({ erreur: "Demande introuvable." }, { status: 404 });
  }
  if (demande.statut !== "ACCORD" && demande.statut !== "REFUS") {
    return NextResponse.json({ erreur: "Aucune réponse enregistrée pour cette demande." }, { status: 409 });
  }

  const personne = await prisma.personne.findUnique({
    where: { id: demande.personneId },
    select: { prenom: true, nom: true, mutuelleNom: true },
  });
  if (!personne) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }

  const modele = await modeleActif("ACCORD_TIERS_PAYANT");

  const pdf = await genererAccordTiersPayantPdf({
    prenom: personne.prenom,
    nom: personne.nom,
    statut: demande.statut,
    reponseA: demande.reponseA,
    montantPriseEnChargeTTC: demande.montantPriseEnChargeTTC,
    motifRefus: demande.motifRefus,
    mutuelleNom: personne.mutuelleNom,
    finess: demande.finess,
    rpps: demande.rpps,
    modele,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="tiers-payant-${personne.prenom}-${personne.nom}.pdf"`,
    },
  });
}
