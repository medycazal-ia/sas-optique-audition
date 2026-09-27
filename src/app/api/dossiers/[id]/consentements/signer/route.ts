import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { enregistrerFichier } from "@/lib/stockageFichiers";
import { genererConsentementRgpdSigne, type MethodeSignatureConsentement } from "@/lib/consentementPdf";
import { normaliserPourNomFichier } from "@/lib/nomFichier";

type RouteParams = { params: Promise<{ id: string }> };

const METHODES_VALIDES: MethodeSignatureConsentement[] = ["ecran", "pad"];

/**
 * POST /api/dossiers/:id/consentements/signer — signature électronique du
 * consentement RGPD directement à l'écran ("ecran") ou au stylet/à l'écran
 * tactile ("pad", avec la signature en pièce jointe "signature") : jusqu'ici
 * ces deux moyens ne produisaient aucun document réel (juste un horodatage,
 * ou pour le stylet l'image brute du tracé sans le texte du consentement) —
 * ils génèrent désormais le même document RGPD complet que le formulaire
 * papier, avec les cases cochées et la preuve de signature intégrées (voir
 * lib/consentementPdf.ts), archivé dans les documents du dossier. Le moyen
 * SMS est traité à part (voir .../signature-sms/verifier/route.ts), qui
 * génère ce même document une fois le code vérifié côté serveur.
 *
 * Signer par l'un de ces moyens vaut acceptation des trois canaux de
 * sollicitation (email, SMS, téléphone) — modifiable ensuite à tout moment
 * via les bascules individuelles de la carte RGPD.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const contentType = request.headers.get("content-type") ?? "";

  let methode: string;
  let signaturePng: Uint8Array | undefined;

  if (contentType.includes("multipart/form-data")) {
    const formulaire = await request.formData();
    methode = formulaire.get("methode")?.toString() ?? "";
    const fichier = formulaire.get("signature");
    if (fichier instanceof File) {
      signaturePng = new Uint8Array(await fichier.arrayBuffer());
    }
  } else {
    const body = await request.json().catch(() => ({}));
    methode = typeof body.methode === "string" ? body.methode : "";
  }

  if (!METHODES_VALIDES.includes(methode as MethodeSignatureConsentement)) {
    return NextResponse.json({ erreur: `methode doit être l'un de : ${METHODES_VALIDES.join(", ")}` }, { status: 400 });
  }
  const methodeValide = methode as MethodeSignatureConsentement;
  if (methodeValide === "pad" && !signaturePng) {
    return NextResponse.json({ erreur: "Signature manquante (champ \"signature\")." }, { status: 400 });
  }

  const personneExistante = await prisma.personne.findUnique({ where: { id }, select: { prenom: true, nom: true } });
  if (!personneExistante) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }

  const maintenant = new Date();
  const pdf = await genererConsentementRgpdSigne({
    prenom: personneExistante.prenom,
    nom: personneExistante.nom,
    consentementEmail: true,
    consentementSms: true,
    consentementTelephone: true,
    methode: methodeValide,
    signaturePng,
  });

  const nomFichier = `${normaliserPourNomFichier(personneExistante.nom)}-${normaliserPourNomFichier(personneExistante.prenom)}-${maintenant.toISOString().slice(0, 10)}-consentement-rgpd.pdf`;
  const { cheminStockage } = await enregistrerFichier(id, nomFichier, Buffer.from(pdf));

  const document = await prisma.document.create({
    data: { personneId: id, type: "CONSENTEMENT_RGPD", nomFichier, cheminStockage },
  });

  const personne = await prisma.personne.update({
    where: { id },
    data: {
      rgpdInformeA: maintenant,
      consentementEmail: true,
      consentementEmailA: maintenant,
      consentementSms: true,
      consentementSmsA: maintenant,
      consentementTelephone: true,
      consentementTelephoneA: maintenant,
    },
  });

  await journaliser({
    type: "consentement.signe",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: session?.email,
    donnees: { methode: methodeValide, documentId: document.id, nomFichier },
  });

  return NextResponse.json(personne);
}
