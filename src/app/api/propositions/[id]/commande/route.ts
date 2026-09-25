import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/propositions/:id/commande — passage de commande fournisseur.
 * "Aucune commande ne peut être passée sans proposition acceptée liée"
 * (critère d'acceptation V1). Bloque aussi (409) tant qu'une demande de
 * prise en charge mutuelle est en attente de réponse — "une fois une
 * proposition acceptée (et l'accord mutuelle obtenu quand nécessaire)" —
 * sauf si un refus explicite de mutuelle a déjà été tracé sur le dossier
 * (rien à attendre dans ce cas). `forcerMalgreMutuelleEnAttente: true`
 * permet un dépassement explicite et tracé (ex. urgence client), jamais un
 * contournement silencieux.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: propositionId } = await params;
  const body = await request.json().catch(() => ({}));
  const forcer = body.forcerMalgreMutuelleEnAttente === true;

  const proposition = await prisma.proposition.findUnique({
    where: { id: propositionId },
    include: { lignes: true, demandes: { orderBy: { creeA: "desc" }, take: 1 } },
  });
  if (!proposition) {
    return NextResponse.json({ erreur: "Proposition introuvable." }, { status: 404 });
  }
  if (proposition.statut !== "ACCEPTEE") {
    return NextResponse.json({ erreur: "Seule une proposition acceptée peut donner lieu à une commande." }, { status: 409 });
  }
  if (proposition.lignes.length === 0) {
    return NextResponse.json({ erreur: "La proposition ne contient aucun produit à commander." }, { status: 409 });
  }

  const demande = proposition.demandes[0];
  const demandeEnAttente = demande && (demande.statut === "A_ENVOYER" || demande.statut === "ENVOYEE" || demande.statut === "EN_ATTENTE");
  if (demandeEnAttente && !forcer) {
    return NextResponse.json(
      {
        erreur: "Une demande de prise en charge mutuelle est encore en attente de réponse.",
        astuce: "Renvoyer avec forcerMalgreMutuelleEnAttente: true pour passer commande quand même.",
      },
      { status: 409 },
    );
  }

  const commande = await prisma.commande.create({
    data: {
      propositionId,
      personneId: proposition.personneId,
      lignes: {
        create: proposition.lignes.map((l) => ({
          produitId: l.produitId,
          libelleProduit: l.libelleProduit,
          quantite: l.quantite,
        })),
      },
    },
    include: { lignes: true },
  });

  await journaliser({
    type: "commande.creee",
    entite: "Commande",
    entiteId: commande.id,
    personneId: proposition.personneId,
    acteur: session?.email,
    donnees: { propositionId, forceMalgreMutuelleEnAttente: Boolean(demandeEnAttente) },
  });

  return NextResponse.json(commande, { status: 201 });
}
