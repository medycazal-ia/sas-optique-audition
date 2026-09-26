import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { envoyerCodeSignatureSms } from "@/lib/signatureSms";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/propositions/:id/signature-sms/envoyer — envoie un code à usage
 * unique par SMS au client, pour signer électroniquement l'acceptation de
 * cette proposition (voir lib/signatureSms.ts — même mécanisme que la
 * signature du consentement RGPD).
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const proposition = await prisma.proposition.findUnique({
    where: { id },
    include: { personne: { select: { telephone: true } } },
  });
  if (!proposition) {
    return NextResponse.json({ erreur: "Proposition introuvable." }, { status: 404 });
  }
  if (proposition.statut !== "ENVOYEE") {
    return NextResponse.json({ erreur: "Seule une proposition envoyée peut être signée." }, { status: 409 });
  }
  if (!proposition.personne.telephone?.trim()) {
    return NextResponse.json(
      { erreur: "Aucun numéro de téléphone renseigné sur ce dossier — complétez-le (carte Client) avant d'envoyer un code." },
      { status: 409 },
    );
  }

  try {
    await envoyerCodeSignatureSms(proposition.personneId, proposition.personne.telephone.trim());
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'envoi du code.";
    return NextResponse.json({ erreur: message }, { status: 502 });
  }

  return NextResponse.json({ envoye: true });
}
