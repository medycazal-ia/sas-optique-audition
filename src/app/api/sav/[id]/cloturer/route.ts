import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/sav/:id/cloturer — en traitement → clôturé.
 * "Un SAV clôturé par un échange déclenche automatiquement une nouvelle
 * Commande si nécessaire" (critère d'acceptation V1) : la commande de
 * remplacement reprend la ligne ciblée par le SAV, ou toutes les lignes de
 * la commande d'origine si le SAV ne ciblait pas une ligne précise — jamais
 * rattachée à une proposition (savId à la place, voir modèle Commande).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const sav = await prisma.sAV.findUnique({
    where: { id },
    include: {
      commandeLigne: true,
      livraison: { include: { commande: { include: { lignes: true } } } },
    },
  });
  if (!sav) {
    return NextResponse.json({ erreur: "SAV introuvable." }, { status: 404 });
  }
  if (sav.statut !== "EN_TRAITEMENT") {
    return NextResponse.json({ erreur: "Seul un SAV en traitement peut être clôturé." }, { status: 409 });
  }

  const noteCloture = typeof body.noteCloture === "string" ? body.noteCloture.trim() || null : null;

  const mise_a_jour = await prisma.sAV.update({
    where: { id },
    data: { statut: "CLOTURE", clotureA: new Date(), noteCloture },
  });

  await journaliser({
    type: "sav.cloture",
    entite: "SAV",
    entiteId: id,
    personneId: sav.personneId,
    acteur: session?.email,
    donnees: { decision: sav.decision },
  });

  if (sav.decision === "ECHANGE") {
    const lignesSource = sav.commandeLigne ? [sav.commandeLigne] : sav.livraison.commande.lignes;
    const commande = await prisma.commande.create({
      data: {
        savId: id,
        personneId: sav.personneId,
        lignes: {
          create: lignesSource.map((l) => ({
            produitId: l.produitId,
            libelleProduit: l.libelleProduit,
            descriptionProduit: l.descriptionProduit,
            quantite: l.quantite,
            sphereOD: l.sphereOD,
            cylindreOD: l.cylindreOD,
            axeOD: l.axeOD,
            additionOD: l.additionOD,
            sphereOG: l.sphereOG,
            cylindreOG: l.cylindreOG,
            axeOG: l.axeOG,
            additionOG: l.additionOG,
          })),
        },
      },
      include: { lignes: true },
    });

    await journaliser({
      type: "sav.echange_commande_creee",
      entite: "Commande",
      entiteId: commande.id,
      personneId: sav.personneId,
      acteur: session?.email,
    });

    return NextResponse.json({ sav: mise_a_jour, commandeRemplacement: commande });
  }

  return NextResponse.json({ sav: mise_a_jour, commandeRemplacement: null });
}
