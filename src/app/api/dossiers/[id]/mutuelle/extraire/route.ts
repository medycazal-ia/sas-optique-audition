import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { lireFichier } from "@/lib/stockageFichiers";
import { extraireMutuelle } from "@/lib/ocrMutuelle";
import { enregistrerPlateformeSiValide } from "@/lib/plateformesTiersPayant";
import { analyserBeneficiaire } from "@/lib/beneficiaires";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/dossiers/:id/mutuelle/extraire — lit un Document CARTE_MUTUELLE
 * déjà scanné (carte Santé) par IA de vision, met à jour les informations
 * mutuelle du dossier, et compare le NSS lu à celui du foyer pour repérer
 * un éventuel ayant droit (voir lib/beneficiaires.ts). `mutuelleExtraitParOcrA`
 * marque le résultat comme non encore relu par un humain.
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
  if (!document || document.personneId !== id || document.type !== "CARTE_MUTUELLE") {
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
    resultat = await extraireMutuelle(contenu, document.nomFichier);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'extraction OCR.";
    return NextResponse.json({ erreur: message }, { status: 502 });
  }

  // Ne complète le NSS du dossier que s'il est encore vide — jamais
  // n'écrase une valeur déjà saisie (celle de la carte Client fait foi).
  const personneActuelle = await prisma.personne.findUnique({ where: { id }, select: { numeroSecuriteSociale: true } });
  const completeNss = !personneActuelle?.numeroSecuriteSociale && resultat.numeroSecuriteSociale;

  const personne = await prisma.personne.update({
    where: { id },
    data: {
      ...(resultat.nomMutuelle ? { mutuelleNom: resultat.nomMutuelle, mutuelleRenseigneeA: new Date(), mutuelleRefuseeA: null } : {}),
      mutuelleNumeroAdherent: resultat.numeroAdherent,
      mutuelleNumeroContrat: resultat.numeroContrat,
      mutuellePlateforme: resultat.plateforme,
      mutuelleExtraitParOcrA: new Date(),
      ...(completeNss ? { numeroSecuriteSociale: resultat.numeroSecuriteSociale } : {}),
    },
  });

  await enregistrerPlateformeSiValide(resultat.plateforme);

  const beneficiaire = await analyserBeneficiaire(id, resultat.numeroSecuriteSociale);

  await journaliser({
    type: "mutuelle.extraite_ocr",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: session?.email,
    donnees: { documentId },
  });

  return NextResponse.json({
    personne,
    numeroSecuriteSociale: resultat.numeroSecuriteSociale,
    beneficiaire,
  });
}
