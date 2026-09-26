import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireFichier } from "@/lib/stockageFichiers";
import { extraireAccordMutuelle } from "@/lib/ocrAccordMutuelle";

type RouteParams = { params: Promise<{ id: string }> };

const TAILLE_MAX_OCTETS = 15 * 1024 * 1024;

/**
 * POST /api/demandes-mutuelle/:id/code-paiement/extraire — lit le courrier
 * de réponse d'une mutuelle (ou plus généralement tout document où apparaît
 * un numéro d'accord/de prise en charge) par IA de vision, pour préremplir
 * le numéro d'accord réel qui deviendra le code paiement (voir
 * lib/ocrAccordMutuelle.ts). Ne sauvegarde rien : le résultat est renvoyé
 * pour relecture/correction avant enregistrement (voir PATCH ./code-paiement).
 *
 * Deux modes, comme POST /api/dossiers/:id/documents :
 * - multipart/form-data (champ "fichier") : nouveau document — capturé par
 *   photo/scan ou téléversé (ex. pièce jointe email enregistrée localement).
 *   Le fichier lui-même n'est pas conservé par CETTE route (elle ne fait
 *   qu'analyser) — c'est à l'appelant de l'enregistrer d'abord via POST
 *   /api/dossiers/:personneId/documents (type REPONSE_MUTUELLE) s'il veut le
 *   garder, typiquement avant d'appeler ici.
 * - JSON { documentId } : document déjà enregistré sur ce dossier (le
 *   logiciel l'a déjà récupéré) — évite de le re-scanner/re-téléverser.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const contentType = request.headers.get("content-type") ?? "";

  let contenu: Buffer;
  let nomFichier: string;

  if (contentType.includes("multipart/form-data")) {
    const formulaire = await request.formData();
    const fichier = formulaire.get("fichier");
    if (!(fichier instanceof File)) {
      return NextResponse.json({ erreur: "Fichier manquant (champ \"fichier\")." }, { status: 400 });
    }
    if (fichier.size > TAILLE_MAX_OCTETS) {
      return NextResponse.json({ erreur: "Fichier trop volumineux (15 Mo max)." }, { status: 400 });
    }
    contenu = Buffer.from(await fichier.arrayBuffer());
    nomFichier = fichier.name;
  } else {
    const body = await request.json().catch(() => ({}));
    const documentId = body.documentId;
    if (typeof documentId !== "string" || !documentId) {
      return NextResponse.json({ erreur: "documentId requis." }, { status: 400 });
    }

    const demande = await prisma.demandePriseEnCharge.findUnique({ where: { id }, select: { personneId: true } });
    if (!demande) {
      return NextResponse.json({ erreur: "Demande introuvable." }, { status: 404 });
    }

    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.personneId !== demande.personneId) {
      return NextResponse.json({ erreur: "Document introuvable pour ce dossier." }, { status: 404 });
    }
    if (document.cheminStockage.startsWith("verifie-sans-scan/")) {
      return NextResponse.json(
        { erreur: "Cette pièce a été vérifiée sans scan — aucune image à analyser." },
        { status: 409 },
      );
    }

    contenu = await lireFichier(document.cheminStockage);
    nomFichier = document.nomFichier;
  }

  try {
    const resultat = await extraireAccordMutuelle(contenu, nomFichier);
    return NextResponse.json(resultat);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'extraction OCR.";
    return NextResponse.json({ erreur: message }, { status: 502 });
  }
}
