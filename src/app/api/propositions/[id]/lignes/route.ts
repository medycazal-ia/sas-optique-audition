import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { correctionActivePourPersonne } from "@/lib/correctionVerrePrefill";
import { correctionVide } from "@/lib/correctionVerre";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/propositions/:id/lignes — ajoute un produit à la proposition.
 * "Aucun produit ne peut être ajouté à une proposition sans vérification de
 * disponibilité" (critère d'acceptation V1) : par défaut, refuse si aucun
 * magasin n'a de stock ; `forcerSansStock: true` permet un dépassement
 * explicite et tracé (ex. commande spéciale), jamais un contournement
 * silencieux. Le prix et le libellé sont figés au moment de l'ajout — le
 * tarif catalogue reste celui en vigueur au moment de la composition, pas
   une valeur qui dérive après coup.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: propositionId } = await params;
  const body = await request.json();

  const produitId = typeof body.produitId === "string" ? body.produitId : "";
  const quantite = Number.isInteger(body.quantite) ? body.quantite : 1;
  const forcerSansStock = body.forcerSansStock === true;

  if (!produitId || quantite < 1) {
    return NextResponse.json({ erreur: "produitId requis et quantite >= 1." }, { status: 400 });
  }

  const proposition = await prisma.proposition.findUnique({ where: { id: propositionId } });
  if (!proposition) {
    return NextResponse.json({ erreur: "Proposition introuvable." }, { status: 404 });
  }
  if (proposition.statut !== "BROUILLON") {
    return NextResponse.json(
      { erreur: "Seule une proposition en brouillon peut recevoir de nouvelles lignes." },
      { status: 409 },
    );
  }

  const produit = await prisma.produit.findUnique({
    where: { id: produitId },
    include: { stocks: true, fournisseur: true },
  });
  if (!produit) {
    return NextResponse.json({ erreur: "Produit introuvable." }, { status: 404 });
  }

  const disponible = produit.stocks.some((s) => s.quantite > 0);
  if (!disponible && !forcerSansStock) {
    const delaiMin = produit.stocks
      .map((s) => s.delaiJoursReappro)
      .filter((d): d is number => d != null)
      .sort((a, b) => a - b)[0];
    return NextResponse.json(
      {
        erreur: "Ce produit n'est disponible dans aucun magasin.",
        delaiJoursReappro: delaiMin ?? null,
        astuce: "Renvoyer avec forcerSansStock: true pour composer quand même (ex. commande spéciale).",
      },
      { status: 409 },
    );
  }

  // Correction optique (catégorie VERRE) : préremplie depuis la dernière
  // ordonnance OPTIQUE du dossier — modifiable ensuite indépendamment (voir
  // modèle PropositionLigne).
  const correction = produit.type === "VERRE" ? await correctionActivePourPersonne(proposition.personneId) : correctionVide();

  const ligne = await prisma.propositionLigne.create({
    data: {
      propositionId,
      produitId,
      quantite,
      libelleProduit: `${produit.marque} ${produit.modele}`,
      prixUnitaireTTC: produit.prixTTC,
      // Instantanés, comme libelleProduit/prixUnitaireTTC ci-dessus — voir
      // le commentaire du modèle PropositionLigne (fournisseurNom n'est
      // jamais imprimé sur devis/facture, seulement transmis en interne et
      // sur les demandes de prise en charge mutuelle/sécurité sociale).
      descriptionProduit: produit.description,
      marqueProduit: produit.marque,
      fournisseurNom: produit.fournisseur?.nom ?? null,
      ...correction,
    },
  });

  await journaliser({
    type: "proposition.ligne_ajoutee",
    entite: "PropositionLigne",
    entiteId: ligne.id,
    personneId: proposition.personneId,
    acteur: session?.email,
    donnees: { produitId, quantite, prixUnitaireTTC: produit.prixTTC, forceSansStock: !disponible },
  });

  return NextResponse.json(ligne, { status: 201 });
}
