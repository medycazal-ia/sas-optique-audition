import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/livraisons/:id/cloturer — remise ou ajustement demandé → clôturée. */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;

  const livraison = await prisma.livraison.findUnique({ where: { id } });
  if (!livraison) {
    return NextResponse.json({ erreur: "Livraison introuvable." }, { status: 404 });
  }
  if (livraison.statut !== "REMISE" && livraison.statut !== "AJUSTEMENT_DEMANDE") {
    return NextResponse.json({ erreur: "Seule une livraison remise ou en ajustement peut être clôturée." }, { status: 409 });
  }

  const mise_a_jour = await prisma.livraison.update({
    where: { id },
    data: { statut: "CLOTUREE", clotureeA: new Date() },
  });

  await journaliser({
    type: "livraison.cloturee",
    entite: "Livraison",
    entiteId: id,
    personneId: livraison.personneId,
    acteur: session?.email,
  });

  return NextResponse.json(mise_a_jour);
}
