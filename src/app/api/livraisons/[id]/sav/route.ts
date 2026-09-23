import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { garantieExpiree } from "@/lib/sav";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/livraisons/:id/sav — ouverture d'un SAV depuis le dossier
 * client existant. "Un SAV référence toujours une Livraison ou un Produit
 * existant du dossier — pas de saisie libre déconnectée" (critère
 * d'acceptation V1) : structurel ici, jamais un SAV sans Livraison.
 * Réservé aux livraisons clôturées — un SAV traite un incident après que
 * le client a réceptionné le produit.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: livraisonId } = await params;
  const body = await request.json();

  const motif = typeof body.motif === "string" ? body.motif.trim() : "";
  if (!motif) {
    return NextResponse.json({ erreur: "motif requis." }, { status: 400 });
  }
  const commandeLigneId = typeof body.commandeLigneId === "string" ? body.commandeLigneId : null;

  const livraison = await prisma.livraison.findUnique({
    where: { id: livraisonId },
    include: { commande: { include: { lignes: { include: { produit: true } } } } },
  });
  if (!livraison) {
    return NextResponse.json({ erreur: "Livraison introuvable." }, { status: 404 });
  }
  if (livraison.statut !== "CLOTUREE") {
    return NextResponse.json({ erreur: "Un SAV ne peut être ouvert que depuis une livraison clôturée." }, { status: 409 });
  }

  let ligne = null;
  if (commandeLigneId) {
    ligne = livraison.commande.lignes.find((l) => l.id === commandeLigneId) ?? null;
    if (!ligne) {
      return NextResponse.json({ erreur: "Cette ligne ne fait pas partie de la commande livrée." }, { status: 400 });
    }
  }

  const sav = await prisma.sAV.create({
    data: { livraisonId, commandeLigneId, personneId: livraison.personneId, motif },
  });

  await journaliser({
    type: "sav.ouvert",
    entite: "SAV",
    entiteId: sav.id,
    personneId: livraison.personneId,
    acteur: session?.email,
    donnees: { motif, commandeLigneId },
  });

  return NextResponse.json(
    {
      ...sav,
      garantieExpiree: ligne ? garantieExpiree(ligne.produit.garantieMois, livraison.remiseA) : null,
    },
    { status: 201 },
  );
}
