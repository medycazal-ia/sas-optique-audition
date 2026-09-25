import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/commandes/:id/recevoir — confirmée → reçue. */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;

  const commande = await prisma.commande.findUnique({ where: { id } });
  if (!commande) {
    return NextResponse.json({ erreur: "Commande introuvable." }, { status: 404 });
  }
  if (commande.statut !== "CONFIRMEE") {
    return NextResponse.json({ erreur: "Seule une commande confirmée peut être marquée reçue." }, { status: 409 });
  }

  const mise_a_jour = await prisma.commande.update({
    where: { id },
    data: { statut: "RECUE", recueA: new Date() },
  });

  await journaliser({
    type: "commande.recue",
    entite: "Commande",
    entiteId: id,
    personneId: commande.personneId,
    acteur: session?.email,
  });

  return NextResponse.json(mise_a_jour);
}
