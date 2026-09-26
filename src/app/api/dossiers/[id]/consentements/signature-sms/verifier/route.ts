import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { verifierCodeSignatureSms } from "@/lib/signatureSms";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/dossiers/:id/consentements/signature-sms/verifier — vérifie le
 * code SMS saisi ; si valide, marque l'étape RGPD "informée" au même titre
 * qu'une validation à l'écran ou qu'une signature au stylet.
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

  const personne = await prisma.personne.update({ where: { id }, data: { rgpdInformeA: new Date() } });

  await journaliser({
    type: "consentement.signe_sms",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: session?.email,
  });

  return NextResponse.json(personne);
}
