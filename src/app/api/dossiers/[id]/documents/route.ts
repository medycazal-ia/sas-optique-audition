import { NextRequest, NextResponse } from "next/server";
import type { TypeDocument } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { enregistrerFichier, supprimerFichier } from "@/lib/stockageFichiers";

type RouteParams = { params: Promise<{ id: string }> };

const TYPES_VALIDES: TypeDocument[] = [
  "CARTE_VITALE",
  "CARTE_MUTUELLE",
  "ORDONNANCE",
  "JUSTIFICATIF",
  "DEVIS_SIGNE",
  "AUTRE",
];
const TAILLE_MAX_OCTETS = 15 * 1024 * 1024; // 15 Mo — suffisant pour un scan, évite l'upload accidentel énorme.

/**
 * POST /api/dossiers/:id/documents — enregistre qu'une pièce a été obtenue.
 * Accepte soit un vrai fichier (multipart/form-data, champ "fichier" —
 * stocké réellement, pas juste référencé), soit un appel JSON sans fichier
 * pour le raccourci "marquer comme obtenue" au comptoir (carte "Complétude
 * du dossier") quand la pièce a été vérifiée visuellement sans être scannée.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const contentType = request.headers.get("content-type") ?? "";

  let type: string | undefined;
  let nomFichier: string;
  let cheminStockage: string;

  if (contentType.includes("multipart/form-data")) {
    const formulaire = await request.formData();
    type = formulaire.get("type")?.toString();
    const fichier = formulaire.get("fichier");

    if (!(fichier instanceof File)) {
      return NextResponse.json({ erreur: "Fichier manquant (champ \"fichier\")." }, { status: 400 });
    }
    if (fichier.size > TAILLE_MAX_OCTETS) {
      return NextResponse.json({ erreur: "Fichier trop volumineux (15 Mo max)." }, { status: 400 });
    }

    const contenu = Buffer.from(await fichier.arrayBuffer());
    const enregistrement = await enregistrerFichier(id, fichier.name, contenu);
    nomFichier = fichier.name;
    cheminStockage = enregistrement.cheminStockage;
  } else {
    const body = await request.json();
    type = body.type;
    nomFichier = typeof body.nomFichier === "string" && body.nomFichier.trim() ? body.nomFichier.trim() : `${String(type).toLowerCase()}.pdf`;
    // Pas de fichier réel dans ce cas — pièce validée visuellement au comptoir sans scan.
    cheminStockage = `verifie-sans-scan/${id}/${nomFichier}`;
  }

  if (!type || !TYPES_VALIDES.includes(type as TypeDocument)) {
    return NextResponse.json(
      { erreur: `type doit être l'un de : ${TYPES_VALIDES.join(", ")}` },
      { status: 400 },
    );
  }
  const typeValide = type as TypeDocument;

  const document = await prisma.document.create({
    data: { personneId: id, type: typeValide, nomFichier, cheminStockage },
  });

  await journaliser({
    type: "document.ajoute",
    entite: "Document",
    entiteId: document.id,
    personneId: id,
    acteur: session?.email,
    donnees: { type, nomFichier },
  });

  return NextResponse.json(document, { status: 201 });
}

/**
 * DELETE /api/dossiers/:id/documents — remet une pièce de la carte Santé à
 * "non fournie" (bascule inverse de POST) : supprime toutes les pièces de
 * ce type pour ce dossier, avec leur fichier réel s'il y en avait un. Une
 * ordonnance liée à la pièce supprimée (dateExpiration, praticien…) est
 * elle aussi retirée — sans quoi son suivi de péremption resterait rattaché
 * à une pièce qu'on vient de dire ne plus avoir.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const type = body.type;

  if (!type || !TYPES_VALIDES.includes(type as TypeDocument)) {
    return NextResponse.json(
      { erreur: `type doit être l'un de : ${TYPES_VALIDES.join(", ")}` },
      { status: 400 },
    );
  }
  const typeValide = type as TypeDocument;

  const documents = await prisma.$transaction(async (tx) => {
    const trouves = await tx.document.findMany({
      where: { personneId: id, type: typeValide },
      include: { ordonnance: true },
    });
    for (const document of trouves) {
      if (document.ordonnance) {
        await tx.ordonnance.delete({ where: { id: document.ordonnance.id } });
      }
    }
    await tx.document.deleteMany({ where: { personneId: id, type: typeValide } });
    return trouves;
  });

  for (const document of documents) {
    if (!document.cheminStockage.startsWith("verifie-sans-scan/")) {
      await supprimerFichier(document.cheminStockage);
    }
  }

  await journaliser({
    type: "document.retire",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: session?.email,
    donnees: { type, nombreSupprime: documents.length },
  });

  return NextResponse.json({ supprime: documents.length });
}
