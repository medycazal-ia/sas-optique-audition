import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { verifierCodeSignatureSms } from "@/lib/signatureSms";
import { enregistrerFichier } from "@/lib/stockageFichiers";
import { genererConsentementRgpdSigne } from "@/lib/consentementPdf";
import { normaliserPourNomFichier } from "@/lib/nomFichier";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/dossiers/:id/consentements/signature-sms/verifier — vérifie le
 * code SMS saisi ; si valide, génère le document RGPD complet (texte +
 * preuve de signature par SMS, voir lib/consentementPdf.ts) et l'archive
 * dans les documents du dossier, au même titre qu'une validation à l'écran
 * ou qu'une signature au stylet (voir .../consentements/signer/route.ts) —
 * jusqu'ici cette étape ne faisait qu'horodater "informé", sans aucun
 * document réel.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";

  if (!code) {
    return NextResponse.json({ erreur: "Code requis." }, { status: 400 });
  }

  const resultat = await verifierCodeSignatureSms(id, code);
  if (!resultat.valide) {
    return NextResponse.json({ erreur: resultat.raison }, { status: 409 });
  }

  const personneExistante = await prisma.personne.findUnique({ where: { id }, select: { prenom: true, nom: true, telephone: true } });
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
    methode: "sms",
    telephone: personneExistante.telephone,
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
    type: "consentement.signe_sms",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: session?.email,
    donnees: { documentId: document.id, nomFichier },
  });

  return NextResponse.json(personne);
}
