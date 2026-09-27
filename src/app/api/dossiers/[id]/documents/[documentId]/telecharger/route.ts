import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier } from "@/lib/stockageFichiers";

type RouteParams = { params: Promise<{ id: string; documentId: string }> };

const TYPES_MIME_PAR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

function typeMime(nomFichier: string): string {
  const extension = nomFichier.split(".").pop()?.toLowerCase() ?? "";
  return TYPES_MIME_PAR_EXTENSION[extension] ?? "application/octet-stream";
}

/**
 * GET /api/dossiers/:id/documents/:documentId/telecharger — sert le fichier
 * réel stocké pour ce document. Protégé par le middleware (comme tout
 * /api/dossiers/**) : jamais accessible sans session valide.
 *
 * `?apercu=1` : affichage direct dans le navigateur (type MIME déduit de
 * l'extension, disposition "inline") plutôt qu'un téléchargement forcé —
 * utilisé pour la popup d'aperçu de l'assistant vocal (voir
 * lib/assistantVocal.ts, ouvrirDocument). Sans ce paramètre, comportement
 * inchangé (téléchargement, type générique) pour tous les autres appelants.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id, documentId } = await params;
  const apercu = request.nextUrl.searchParams.get("apercu") === "1";

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
      "Content-Type": apercu ? typeMime(document.nomFichier) : "application/octet-stream",
      "Content-Disposition": `${apercu ? "inline" : "attachment"}; filename="${document.nomFichier.replace(/"/g, "")}"`,
    },
  });
}
