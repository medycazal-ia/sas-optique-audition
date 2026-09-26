import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/demandes-mutuelle/:id/code-paiement — remplace le code
 * paiement fictif (jeton aléatoire, voir lib/codePaiement.ts) par le
 * véritable numéro d'accord/de prise en charge délivré par la mutuelle, dès
 * qu'il est connu — extrait par OCR (POST ./extraire) ou saisi à la main.
 * Utilisable à tout moment après l'accord (pas seulement à l'instant de
 * l'accord), pour couvrir le cas où le numéro n'arrive que plus tard via un
 * document séparé. Le QR (voir ./qrcode) encode toujours le code courant :
 * aucune régénération n'est nécessaire, l'écriture ci-dessous suffit.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const codePaiement = typeof body.codePaiement === "string" ? body.codePaiement.trim() : "";
  if (!codePaiement) {
    return NextResponse.json({ erreur: "codePaiement (numéro d'accord) requis." }, { status: 400 });
  }

  const demande = await prisma.demandePriseEnCharge.findUnique({ where: { id } });
  if (!demande) {
    return NextResponse.json({ erreur: "Demande introuvable." }, { status: 404 });
  }
  if (!demande.codePaiement) {
    return NextResponse.json(
      { erreur: "Aucun code paiement à remplacer sur cette demande — elle doit d'abord être en accord." },
      { status: 409 },
    );
  }

  let mise_a_jour;
  try {
    mise_a_jour = await prisma.demandePriseEnCharge.update({ where: { id }, data: { codePaiement } });
  } catch (erreur: unknown) {
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002") {
      return NextResponse.json({ erreur: "Ce numéro d'accord est déjà utilisé par une autre demande." }, { status: 409 });
    }
    throw erreur;
  }

  await journaliser({
    type: "demande-mutuelle.code_paiement_modifie",
    entite: "DemandePriseEnCharge",
    entiteId: id,
    personneId: demande.personneId,
    acteur: session?.email,
    donnees: { codePaiement },
  });

  return NextResponse.json(mise_a_jour);
}
