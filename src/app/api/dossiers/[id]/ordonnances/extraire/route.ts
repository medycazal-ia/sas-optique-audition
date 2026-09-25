import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { lireFichier } from "@/lib/stockageFichiers";
import { extraireMesuresOrdonnance } from "@/lib/ocrOrdonnance";
import { enregistrerCabinetSiValide } from "@/lib/cabinets";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/dossiers/:id/ordonnances/extraire — lit un Document ORDONNANCE
 * déjà scanné (carte Santé) par IA de vision, et en dérive/met à jour une
 * Ordonnance de type OPTIQUE avec les mesures lues. `extraitParOcrA` marque
 * le résultat comme non encore relu par un humain — jamais présenté comme
 * définitif tant qu'il n'a pas été corrigé/confirmé manuellement.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const documentId = body.documentId;

  if (typeof documentId !== "string" || !documentId) {
    return NextResponse.json({ erreur: "documentId requis." }, { status: 400 });
  }

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.personneId !== id || document.type !== "ORDONNANCE") {
    return NextResponse.json({ erreur: "Document introuvable pour ce dossier." }, { status: 404 });
  }
  if (document.cheminStockage.startsWith("verifie-sans-scan/")) {
    return NextResponse.json(
      { erreur: "Cette pièce a été vérifiée sans scan — aucune image à analyser." },
      { status: 409 },
    );
  }

  let resultat;
  try {
    const contenu = await lireFichier(document.cheminStockage);
    resultat = await extraireMesuresOrdonnance(contenu, document.nomFichier);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'extraction OCR.";
    return NextResponse.json({ erreur: message }, { status: 502 });
  }

  const donneesCommunes = {
    dateEmission: resultat.dateEmission ? new Date(resultat.dateEmission) : new Date(),
    emisePar: resultat.emisePar,
    cabinetNom: resultat.cabinetNom,
    finess: resultat.finess,
    rpps: resultat.rpps,
    sphereOD: resultat.od.sphere,
    cylindreOD: resultat.od.cylindre,
    axeOD: resultat.od.axe,
    additionOD: resultat.od.addition,
    sphereOG: resultat.og.sphere,
    cylindreOG: resultat.og.cylindre,
    axeOG: resultat.og.axe,
    additionOG: resultat.og.addition,
    extraitParOcrA: new Date(),
  };

  const ordonnance = await prisma.ordonnance.upsert({
    where: { documentId },
    update: donneesCommunes,
    create: { personneId: id, type: "OPTIQUE", documentId, ...donneesCommunes },
  });

  await enregistrerCabinetSiValide(resultat.cabinetNom, resultat.finess);

  await journaliser({
    type: "ordonnance.extraite_ocr",
    entite: "Ordonnance",
    entiteId: ordonnance.id,
    personneId: id,
    acteur: session?.email,
    donnees: { documentId },
  });

  return NextResponse.json(ordonnance);
}
