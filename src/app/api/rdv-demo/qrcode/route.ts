import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * GET /api/rdv-demo/qrcode — PNG du QR code "RDV DEMO" (page d'accueil),
 * affiché à côté du bouton "Je découvre FACILOG" pour les prospects qui
 * préfèrent scanner plutôt que cliquer. Encode une URL absolue vers
 * /rdv-demo, sur le modèle du QR code produit (voir
 * api/produits/[id]/qrcode) — ainsi le lien reste correct même si le nom de
 * domaine change (ex. facilog.site).
 */
export async function GET(request: NextRequest) {
  const url = new URL("/rdv-demo", request.nextUrl.origin).toString();
  const png = await QRCode.toBuffer(url, { type: "png", width: 320, margin: 2 });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
