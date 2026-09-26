import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genererDevisPdf } from "@/lib/devisPdf";
import { modeleActif } from "@/lib/modelesDocuments";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/propositions/:id/formulaire — devis imprimable (voir
 * lib/devisPdf.ts), pour un client qui préfère signer sur papier plutôt que
 * de valider à l'écran, au stylet, ou par code SMS.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const proposition = await prisma.proposition.findUnique({
    where: { id },
    include: { personne: { select: { prenom: true, nom: true } }, lignes: true },
  });
  if (!proposition) {
    return NextResponse.json({ erreur: "Proposition introuvable." }, { status: 404 });
  }

  const modele = await modeleActif(proposition.cent100Sante ? "DEVIS_NORMALISE" : "DEVIS_NON_NORMALISE");

  const pdf = await genererDevisPdf({
    prenom: proposition.personne.prenom,
    nom: proposition.personne.nom,
    creeA: proposition.creeA,
    lignes: proposition.lignes.map((l) => ({
      libelle: l.libelleProduit,
      quantite: l.quantite,
      prixUnitaireTTC: l.prixUnitaireTTC,
    })),
    normalise: proposition.cent100Sante,
    modele,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="devis-${proposition.personne.prenom}-${proposition.personne.nom}.pdf"`,
    },
  });
}
