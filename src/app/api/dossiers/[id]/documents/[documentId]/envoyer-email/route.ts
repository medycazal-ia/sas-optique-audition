import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { lireFichier } from "@/lib/stockageFichiers";
import { envoyerDocumentParEmail } from "@/lib/emailDocument";

type RouteParams = { params: Promise<{ id: string; documentId: string }> };

/**
 * POST /api/dossiers/:id/documents/:documentId/envoyer-email — envoie le
 * document en pièce jointe au destinataire indiqué (voir carte "Client"/
 * "Santé" > Documents). Le fichier est relu à chaque envoi, jamais mis en
 * cache.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id, documentId } = await params;
  const body = await request.json().catch(() => ({}));
  const destinataire = typeof body.destinataire === "string" ? body.destinataire.trim() : "";
  if (!destinataire) {
    return NextResponse.json({ erreur: "destinataire requis." }, { status: 400 });
  }

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.personneId !== id) {
    return NextResponse.json({ erreur: "Document introuvable." }, { status: 404 });
  }
  if (document.cheminStockage.startsWith("verifie-sans-scan/")) {
    return NextResponse.json(
      { erreur: "Cette pièce a été vérifiée sans scan — aucun fichier à envoyer." },
      { status: 409 },
    );
  }

  try {
    const contenu = await lireFichier(document.cheminStockage);
    await envoyerDocumentParEmail({
      destinataire,
      sujet: `Document — ${document.nomFichier}`,
      texte: `Veuillez trouver ci-joint le document "${document.nomFichier}".`,
      nomFichier: document.nomFichier,
      contenu,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'envoi.";
    return NextResponse.json({ erreur: message }, { status: 502 });
  }

  await journaliser({
    type: "document.envoye_email",
    entite: "Document",
    entiteId: documentId,
    personneId: id,
    acteur: session?.email,
    donnees: { destinataire, nomFichier: document.nomFichier },
  });

  return NextResponse.json({ ok: true });
}
