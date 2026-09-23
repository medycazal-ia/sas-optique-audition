import { NextRequest, NextResponse } from "next/server";
import type { DecisionSAV } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

const DECISIONS_VALIDES: DecisionSAV[] = ["REPARATION", "ECHANGE", "REMBOURSEMENT"];

/** POST /api/sav/:id/diagnostiquer — ouvert → diagnostiqué. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const diagnostic = typeof body.diagnostic === "string" ? body.diagnostic.trim() : "";
  if (!diagnostic) {
    return NextResponse.json({ erreur: "diagnostic requis." }, { status: 400 });
  }
  if (!DECISIONS_VALIDES.includes(body.decision)) {
    return NextResponse.json({ erreur: `decision doit être l'une de : ${DECISIONS_VALIDES.join(", ")}` }, { status: 400 });
  }

  const sav = await prisma.sAV.findUnique({ where: { id } });
  if (!sav) {
    return NextResponse.json({ erreur: "SAV introuvable." }, { status: 404 });
  }
  if (sav.statut !== "OUVERT") {
    return NextResponse.json({ erreur: "Seul un SAV ouvert peut être diagnostiqué." }, { status: 409 });
  }

  const mise_a_jour = await prisma.sAV.update({
    where: { id },
    data: {
      statut: "DIAGNOSTIQUE",
      diagnostiqueA: new Date(),
      diagnostic,
      decision: body.decision as DecisionSAV,
      garantieConstructeur: body.garantieConstructeur === true,
      garantieMagasin: body.garantieMagasin === true,
    },
  });

  await journaliser({
    type: "sav.diagnostique",
    entite: "SAV",
    entiteId: id,
    personneId: sav.personneId,
    acteur: session?.email,
    donnees: { decision: body.decision },
  });

  return NextResponse.json(mise_a_jour);
}
