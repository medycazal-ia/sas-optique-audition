import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/livraisons/:id — programme (ou reprogramme) le rendez-vous de
 * remise. Séparé des transitions de statut pour rester modifiable tant que
 * la livraison n'est pas remise (comme les coordonnées du dossier).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const dateProgrammee = typeof body.dateProgrammee === "string" ? new Date(body.dateProgrammee) : null;
  if (!dateProgrammee || Number.isNaN(dateProgrammee.getTime())) {
    return NextResponse.json({ erreur: "dateProgrammee (ISO 8601) requise." }, { status: 400 });
  }

  const livraison = await prisma.livraison.findUnique({ where: { id } });
  if (!livraison) {
    return NextResponse.json({ erreur: "Livraison introuvable." }, { status: 404 });
  }
  if (livraison.statut !== "PROGRAMMEE") {
    return NextResponse.json({ erreur: "Seule une livraison programmée peut être reprogrammée." }, { status: 409 });
  }

  const mise_a_jour = await prisma.livraison.update({ where: { id }, data: { dateProgrammee } });

  await journaliser({
    type: "livraison.programmee",
    entite: "Livraison",
    entiteId: id,
    personneId: livraison.personneId,
    acteur: session?.email,
    donnees: { dateProgrammee },
  });

  return NextResponse.json(mise_a_jour);
}
