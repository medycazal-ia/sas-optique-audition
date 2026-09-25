import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/commandes/:id/passer — à passer → passée. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const commande = await prisma.commande.findUnique({ where: { id } });
  if (!commande) {
    return NextResponse.json({ erreur: "Commande introuvable." }, { status: 404 });
  }
  if (commande.statut !== "A_PASSER") {
    return NextResponse.json({ erreur: "Seule une commande à passer peut être marquée passée." }, { status: 409 });
  }

  const delaiJoursEstime = Number.isInteger(body.delaiJoursEstime) ? body.delaiJoursEstime : null;

  const mise_a_jour = await prisma.commande.update({
    where: { id },
    data: { statut: "PASSEE", passeeA: new Date(), delaiJoursEstime },
  });

  await journaliser({
    type: "commande.passee",
    entite: "Commande",
    entiteId: id,
    personneId: commande.personneId,
    acteur: session?.email,
    donnees: { delaiJoursEstime },
  });

  return NextResponse.json(mise_a_jour);
}
