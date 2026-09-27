import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/siteUrl";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/demandes-mutuelle/:id/code-paiement/qrcode — PNG du QR "code
 * paiement" de cette demande (voir lib/codePaiement.ts), à imprimer/joindre
 * pour le rapprochement du règlement. 404 tant qu'aucun accord n'a encore
 * généré de code (voir POST .../reponse). Voir lib/siteUrl.ts pour
 * pourquoi une constante fixe plutôt que request.nextUrl.origin.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const demande = await prisma.demandePriseEnCharge.findUnique({ where: { id }, select: { codePaiement: true } });
  if (!demande?.codePaiement) {
    return NextResponse.json({ erreur: "Aucun code paiement pour cette demande." }, { status: 404 });
  }

  const url = new URL(`/paiements/${demande.codePaiement}`, SITE_URL).toString();
  const png = await QRCode.toBuffer(url, { type: "png", width: 320, margin: 2 });

  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
