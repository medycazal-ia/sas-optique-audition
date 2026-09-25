import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier } from "@/lib/stockageFichiers";

type RouteParams = { params: Promise<{ id: string; documentId: string }> };

/**
 * GET /api/dossiers/:id/documents/:documentId/telecharger — sert le fichier
 * réel stocké pour ce document. Protégé par le middleware (comme tout
 * /api/dossiers/**) : jamais accessible sans session valide.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id, documentId } = await params;

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.personneId !== id) {
    return NextResponse.json({ erreur: "Document introuvable." }, { status: 404 });
  }

  let contenu: Buffer;
  try {
    contenu = await lireFichier(document.cheminStockage);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Aucun fichier scanné pour cette pièce.";
    return NextResponse.json({ erreur: message }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(contenu), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${document.nomFichier.replace(/"/g, "")}"`,
    },
  });
}
