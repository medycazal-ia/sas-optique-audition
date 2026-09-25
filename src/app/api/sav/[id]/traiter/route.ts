import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/sav/:id/traiter — diagnostiqué → en traitement (réparation/échange). */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;

  const sav = await prisma.sAV.findUnique({ where: { id } });
  if (!sav) {
    return NextResponse.json({ erreur: "SAV introuvable." }, { status: 404 });
  }
  if (sav.statut !== "DIAGNOSTIQUE") {
    return NextResponse.json({ erreur: "Seul un SAV diagnostiqué peut passer en traitement." }, { status: 409 });
  }

  const mise_a_jour = await prisma.sAV.update({ where: { id }, data: { statut: "EN_TRAITEMENT", traitementA: new Date() } });

  await journaliser({
    type: "sav.en_traitement",
    entite: "SAV",
    entiteId: id,
    personneId: sav.personneId,
    acteur: session?.email,
  });

  return NextResponse.json(mise_a_jour);
}
