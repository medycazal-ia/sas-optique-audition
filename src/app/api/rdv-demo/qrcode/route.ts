import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * GET /api/rdv-demo/qrcode — PNG du QR code "RDV DEMO" (page d'accueil),
 * affiché à côté du bouton "Je découvre FACILOG" pour les prospects qui
 * préfèrent scanner plutôt que cliquer. Encode une URL absolue vers
 * /rdv-demo — voir lib/siteUrl.ts pour pourquoi une constante fixe plutôt
 * que request.nextUrl.origin (adresse interne du serveur sur Render, pas
 * l'adresse publique).
 */
export async function GET() {
  const url = new URL("/rdv-demo", SITE_URL).toString();
  const png = await QRCode.toBuffer(url, { type: "png", width: 320, margin: 2 });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
