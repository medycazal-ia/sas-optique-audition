import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/dossiers/:id/consentements — endpoint dédié RGPD.
 * Critère d'acceptation V1 : "consentements (email/SMS) stockés avec
 * horodatage et modifiables à tout moment par le client". Chaque changement
 * est journalisé séparément des autres modifications du dossier.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const donnees: Record<string, unknown> = {};
  const maintenant = new Date();

  if (typeof body.consentementEmail === "boolean") {
    donnees.consentementEmail = body.consentementEmail;
    donnees.consentementEmailA = maintenant;
  }
  if (typeof body.consentementSms === "boolean") {
    donnees.consentementSms = body.consentementSms;
    donnees.consentementSmsA = maintenant;
  }
  if (typeof body.consentementTelephone === "boolean") {
    donnees.consentementTelephone = body.consentementTelephone;
    donnees.consentementTelephoneA = maintenant;
  }
  // Horodate le moment où le client a été informé des traitements RGPD et a
  // validé ses choix sur cet écran (voir la pop-up de la carte RGPD) — ne
  // repasse jamais à null ensuite, une information donnée ne se "retire" pas.
  if (body.informe === true) {
    donnees.rgpdInformeA = maintenant;
  }

  if (Object.keys(donnees).length === 0) {
    return NextResponse.json(
      { erreur: "Préciser consentementEmail, consentementSms, consentementTelephone (booléen) et/ou informe: true." },
      { status: 400 },
    );
  }

  const personne = await prisma.personne.update({ where: { id }, data: donnees });

  await journaliser({
    type: "consentement.modifie",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: session?.email,
    donnees,
  });

  return NextResponse.json(personne);
}
