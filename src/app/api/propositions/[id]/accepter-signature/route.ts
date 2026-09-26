import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { verifierCodeSignatureSms } from "@/lib/signatureSms";
import { creerDemandePriseEnCharge } from "@/lib/demandesPriseEnCharge";

type RouteParams = { params: Promise<{ id: string }> };

const MODES_VALIDES = ["PAD", "SMS", "PAPIER"] as const;
type ModeSignature = (typeof MODES_VALIDES)[number];

/**
 * POST /api/propositions/:id/accepter-signature — accepte une proposition
 * via une preuve de signature électronique (au stylet/écran tactile, par
 * code SMS, ou papier scanné), plutôt que la simple validation manuelle de
 * POST .../decision. Même effet final (statut ACCEPTEE, demande de prise
 * en charge créée), mais trace en plus comment le consentement a été
 * recueilli (Proposition.signatureMode) — utile en cas de litige.
 *
 * - mode "PAD"/"PAPIER" : `documentId` d'un Document CONSENTEMENT... pardon,
 *   DEVIS_SIGNE déjà téléversé pour ce dossier (signature au stylet
 *   exportée en image, ou scan du devis signé à la main) — rattaché à
 *   cette proposition précise.
 * - mode "SMS" : `code` reçu par SMS, vérifié ici même.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const mode = body.mode as ModeSignature;
  if (!MODES_VALIDES.includes(mode)) {
    return NextResponse.json({ erreur: `mode doit être l'un de : ${MODES_VALIDES.join(", ")}.` }, { status: 400 });
  }

  const proposition = await prisma.proposition.findUnique({ where: { id } });
  if (!proposition) {
    return NextResponse.json({ erreur: "Proposition introuvable." }, { status: 404 });
  }
  if (proposition.statut !== "ENVOYEE") {
    return NextResponse.json({ erreur: "Seule une proposition envoyée peut être signée." }, { status: 409 });
  }

  if (mode === "SMS") {
    const code = typeof body.code === "string" ? body.code : "";
    if (!code) {
      return NextResponse.json({ erreur: "Code requis." }, { status: 400 });
    }
    const resultat = await verifierCodeSignatureSms(proposition.personneId, code);
    if (!resultat.valide) {
      return NextResponse.json({ erreur: resultat.raison }, { status: 409 });
    }
  } else {
    // PAD ou PAPIER : un Document DEVIS_SIGNE déjà téléversé pour ce
    // dossier, qu'on rattache ici à cette proposition précise (un même
    // dossier peut avoir plusieurs devis au fil du temps).
    const documentId = typeof body.documentId === "string" ? body.documentId : "";
    if (!documentId) {
      return NextResponse.json({ erreur: "documentId requis pour ce mode de signature." }, { status: 400 });
    }
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.personneId !== proposition.personneId || document.type !== "DEVIS_SIGNE") {
      return NextResponse.json({ erreur: "Document introuvable pour ce dossier." }, { status: 404 });
    }
    await prisma.document.update({ where: { id: documentId }, data: { propositionId: id } });
  }

  const mise_a_jour = await prisma.proposition.update({
    where: { id },
    data: { statut: "ACCEPTEE", decideeA: new Date(), signatureMode: mode },
  });

  await journaliser({
    type: "proposition.acceptee",
    entite: "Proposition",
    entiteId: id,
    personneId: proposition.personneId,
    acteur: session?.email,
    donnees: { signatureMode: mode },
  });

  await creerDemandePriseEnCharge({ propositionId: id, personneId: proposition.personneId, acteur: session?.email });

  return NextResponse.json(mise_a_jour);
}
