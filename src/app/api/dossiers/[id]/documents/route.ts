import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";

type RouteParams = { params: Promise<{ id: string }> };

const TYPES_VALIDES = ["CARTE_VITALE", "CARTE_MUTUELLE", "ORDONNANCE", "JUSTIFICATIF", "DEVIS_SIGNE", "AUTRE"];

/**
 * POST /api/dossiers/:id/documents — enregistre qu'une pièce a été obtenue
 * (carte "Complétude du dossier" : "un parcours qui indique la pièce
 * suivante à fournir"). Le stockage réel du fichier (scan, upload) est hors
 * périmètre de cette première passe — seule la métadonnée est tracée ici ;
 * `cheminStockage` pointera vers un stockage S3-compatible HDS en production.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  if (typeof body.type !== "string" || !TYPES_VALIDES.includes(body.type)) {
    return NextResponse.json(
      { erreur: `type doit être l'un de : ${TYPES_VALIDES.join(", ")}` },
      { status: 400 },
    );
  }
  const nomFichier = typeof body.nomFichier === "string" && body.nomFichier.trim() ? body.nomFichier.trim() : `${body.type.toLowerCase()}.pdf`;

  const document = await prisma.document.create({
    data: {
      personneId: id,
      type: body.type,
      nomFichier,
      cheminStockage: typeof body.cheminStockage === "string" ? body.cheminStockage : `a-definir/${id}/${nomFichier}`,
    },
  });

  await journaliser({
    type: "document.ajoute",
    entite: "Document",
    entiteId: document.id,
    personneId: id,
    donnees: { type: body.type, nomFichier },
  });

  return NextResponse.json(document, { status: 201 });
}
