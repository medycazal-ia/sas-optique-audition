import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genererFacturePdf } from "@/lib/facturePdf";
import { modeleActif } from "@/lib/modelesDocuments";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/factures/:id/formulaire — facture imprimable (voir
 * lib/facturePdf.ts), en-tête/pied de page configurables depuis la carte
 * Super Admin "Modèles de documents".
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const facture = await prisma.facture.findUnique({
    where: { id },
    include: {
      livraison: { include: { commande: { include: { lignes: true } } } },
    },
  });
  if (!facture) {
    return NextResponse.json({ erreur: "Facture introuvable." }, { status: 404 });
  }

  const personne = await prisma.personne.findUnique({ where: { id: facture.personneId }, select: { prenom: true, nom: true } });
  if (!personne) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }

  const modele = await modeleActif("FACTURE");

  const pdf = await genererFacturePdf({
    prenom: personne.prenom,
    nom: personne.nom,
    creeA: facture.creeA,
    montantTTC: facture.montantTTC,
    lignes: facture.livraison.commande.lignes.map((l) => ({
      libelle: l.libelleProduit,
      quantite: l.quantite,
      prixUnitaireTTC: l.prixUnitaireTTC,
    })),
    modele,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="facture-${personne.prenom}-${personne.nom}.pdf"`,
    },
  });
}
