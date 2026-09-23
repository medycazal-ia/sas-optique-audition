import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/propositions/:id/decision — envoyée → acceptée / refusée.
 * "Le passage au statut acceptée déclenche automatiquement une tâche
 * visible côté Mutuelle & tiers payant" (critère d'acceptation V1) : ce
 * module n'existant pas encore, on se contente de journaliser l'événement
 * dédié ("proposition.acceptee") pour qu'un futur module Mutuelle puisse
 * s'y accrocher sans réécrire cette route.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const decision = body.decision;
  if (decision !== "ACCEPTEE" && decision !== "REFUSEE") {
    return NextResponse.json({ erreur: "decision doit être ACCEPTEE ou REFUSEE." }, { status: 400 });
  }

  const proposition = await prisma.proposition.findUnique({ where: { id } });
  if (!proposition) {
    return NextResponse.json({ erreur: "Proposition introuvable." }, { status: 404 });
  }
  if (proposition.statut !== "ENVOYEE") {
    return NextResponse.json({ erreur: "Seule une proposition envoyée peut recevoir une décision." }, { status: 409 });
  }

  const mise_a_jour = await prisma.proposition.update({
    where: { id },
    data: { statut: decision, decideeA: new Date() },
  });

  await journaliser({
    type: decision === "ACCEPTEE" ? "proposition.acceptee" : "proposition.refusee",
    entite: "Proposition",
    entiteId: id,
    personneId: proposition.personneId,
    acteur: session?.email,
  });

  return NextResponse.json(mise_a_jour);
}
