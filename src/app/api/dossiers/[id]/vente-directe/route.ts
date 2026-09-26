import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/dossiers/:id/vente-directe — vente comptoir immédiate, sans
 * devis ni mutuelle : crée en une seule fois la Commande (déjà contrôlée),
 * la Livraison (déjà remise et clôturée — l'article part avec le client
 * tout de suite) et la Facture (montant figé depuis le prix catalogue au
 * moment de la vente, jamais recalculé ensuite — même principe que
 * PropositionLigne). Bloquée si le dossier n'a pas au moins un nom et un
 * prénom renseignés.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: personneId } = await params;
  const body = await request.json().catch(() => ({}));

  const personne = await prisma.personne.findUnique({ where: { id: personneId } });
  if (!personne) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }
  if (!personne.nom.trim() || !personne.prenom.trim()) {
    return NextResponse.json(
      { erreur: "Nom et prénom du dossier sont requis avant une vente directe." },
      { status: 409 },
    );
  }

  const lignesDemandees: Array<{ produitId: string; quantite: number }> = Array.isArray(body.lignes)
    ? body.lignes
        .filter(
          (l: unknown): l is { produitId: string; quantite?: unknown } =>
            typeof l === "object" && l !== null && typeof (l as { produitId?: unknown }).produitId === "string",
        )
        .map((l: { produitId: string; quantite?: unknown }) => ({
          produitId: l.produitId,
          quantite: Number.isFinite(l.quantite) && Number(l.quantite) > 0 ? Math.floor(Number(l.quantite)) : 1,
        }))
    : [];

  if (lignesDemandees.length === 0) {
    return NextResponse.json({ erreur: "Au moins un article est requis." }, { status: 400 });
  }

  const produits = await prisma.produit.findMany({
    where: { id: { in: lignesDemandees.map((l) => l.produitId) } },
  });
  const produitParId = new Map(produits.map((p) => [p.id, p]));
  for (const ligne of lignesDemandees) {
    if (!produitParId.has(ligne.produitId)) {
      return NextResponse.json({ erreur: "Article introuvable dans le catalogue." }, { status: 400 });
    }
  }

  const montantTTC = lignesDemandees.reduce((s, l) => s + produitParId.get(l.produitId)!.prixTTC * l.quantite, 0);
  const maintenant = new Date();

  const { commande, livraison, facture } = await prisma.$transaction(async (tx) => {
    const commande = await tx.commande.create({
      data: {
        personneId,
        statut: "CONTROLEE",
        passeeA: maintenant,
        confirmeeA: maintenant,
        recueA: maintenant,
        controleeA: maintenant,
        lignes: {
          create: lignesDemandees.map((l) => {
            const produit = produitParId.get(l.produitId)!;
            return {
              produitId: produit.id,
              libelleProduit: `${produit.marque} ${produit.modele}`,
              descriptionProduit: produit.description,
              quantite: l.quantite,
              prixUnitaireTTC: produit.prixTTC,
            };
          }),
        },
      },
    });

    const livraison = await tx.livraison.create({
      data: { commandeId: commande.id, personneId, statut: "CLOTUREE", remiseA: maintenant, clotureeA: maintenant },
    });

    const facture = await tx.facture.create({
      data: { livraisonId: livraison.id, personneId, montantTTC },
    });

    return { commande, livraison, facture };
  });

  await journaliser({
    type: "vente.directe",
    entite: "Facture",
    entiteId: facture.id,
    personneId,
    acteur: session?.email,
    donnees: { commandeId: commande.id, livraisonId: livraison.id, montantTTC, articles: lignesDemandees.length },
  });

  return NextResponse.json(
    { commandeId: commande.id, livraisonId: livraison.id, factureId: facture.id, montantTTC },
    { status: 201 },
  );
}
