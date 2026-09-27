import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/siteUrl";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/produits/:id/qrcode — PNG du QR code de cet article, à imprimer/
 * apposer sur le produit ou son emballage. Encode une URL absolue vers la
 * page de scan (/produits/:id/scan) — ainsi un smartphone/tablette qui le lit
 * ouvre directement, dans son navigateur, la bonne page de l'application
 * (protégée par la connexion existante, comme le reste du site), sans
 * application ni lecteur dédié. Voir lib/siteUrl.ts pour pourquoi une
 * constante fixe plutôt que request.nextUrl.origin.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const produit = await prisma.produit.findUnique({ where: { id }, select: { id: true } });
  if (!produit) {
    return NextResponse.json({ erreur: "Produit introuvable." }, { status: 404 });
  }

  const url = new URL(`/produits/${id}/scan`, SITE_URL).toString();
  const png = await QRCode.toBuffer(url, { type: "png", width: 320, margin: 2 });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
