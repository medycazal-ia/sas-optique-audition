import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/produits/:id/qrcode — PNG du QR code de cet article, à imprimer/
 * apposer sur le produit ou son emballage. Encode une URL absolue vers la
 * page de scan (/produits/:id/scan) — ainsi un smartphone/tablette qui le lit
 * ouvre directement, dans son navigateur, la bonne page de l'application
 * (protégée par la connexion existante, comme le reste du site), sans
 * application ni lecteur dédié.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const produit = await prisma.produit.findUnique({ where: { id }, select: { id: true } });
  if (!produit) {
    return NextResponse.json({ erreur: "Produit introuvable." }, { status: 404 });
  }

  const url = new URL(`/produits/${id}/scan`, request.nextUrl.origin).toString();
  const png = await QRCode.toBuffer(url, { type: "png", width: 320, margin: 2 });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
