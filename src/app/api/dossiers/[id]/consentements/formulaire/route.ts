import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genererFormulaireConsentementRgpd } from "@/lib/consentementPdf";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/dossiers/:id/consentements/formulaire — formulaire RGPD papier
 * pré-rempli (voir lib/consentementPdf.ts), pour un client qui préfère
 * signer sur papier plutôt que valider ses choix à l'écran. Le document
 * signé doit ensuite être scanné et téléversé (type CONSENTEMENT_RGPD).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const personne = await prisma.personne.findUnique({ where: { id }, select: { prenom: true, nom: true } });
  if (!personne) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }

  const pdf = await genererFormulaireConsentementRgpd(personne);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="consentement-rgpd-${personne.prenom}-${personne.nom}.pdf"`,
    },
  });
}
