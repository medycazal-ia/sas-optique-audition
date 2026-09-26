import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { envoyerCodeSignatureSms } from "@/lib/signatureSms";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/dossiers/:id/consentements/signature-sms/envoyer — envoie un
 * code à usage unique par SMS au numéro du dossier, pour la signature
 * électronique du consentement RGPD (voir lib/signatureSms.ts).
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const personne = await prisma.personne.findUnique({ where: { id }, select: { telephone: true } });
  if (!personne) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }
  if (!personne.telephone?.trim()) {
    return NextResponse.json(
      { erreur: "Aucun numéro de téléphone renseigné sur ce dossier — complétez-le (carte Client) avant d'envoyer un code." },
      { status: 409 },
    );
  }

  try {
    await envoyerCodeSignatureSms(id, personne.telephone.trim());
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'envoi du code.";
    return NextResponse.json({ erreur: message }, { status: 502 });
  }

  return NextResponse.json({ envoye: true });
}
