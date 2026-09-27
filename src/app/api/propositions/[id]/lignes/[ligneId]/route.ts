import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { validerCorrectionVerre } from "@/lib/correctionVerre";
import { estRemiseAutorisee, REMISES_AUTORISEES } from "@/lib/remiseProposition";

type RouteParams = { params: Promise<{ id: string; ligneId: string }> };

/**
 * PATCH /api/propositions/:id/lignes/:ligneId — corrige la correction
 * optique (catégorie VERRE) et/ou la remise d'une ligne.
 *
 * La correction optique reste modifiable quel que soit le statut : ce n'est
 * pas un engagement commercial mais une donnée factuelle, qui peut avoir
 * besoin d'être rectifiée après coup (erreur de saisie, correction reçue du
 * laboratoire différente de la prescription).
 *
 * La remise, elle, est un engagement commercial (comme le prix) : modifiable
 * uniquement tant que la proposition est en brouillon — même règle que
 * l'ajout/retrait de lignes (voir POST/DELETE ci-contre).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: propositionId, ligneId } = await params;
  const body = await request.json().catch(() => ({}));

  const proposition = await prisma.proposition.findUnique({ where: { id: propositionId } });
  if (!proposition) {
    return NextResponse.json({ erreur: "Proposition introuvable." }, { status: 404 });
  }
  const ligne = await prisma.propositionLigne.findUnique({ where: { id: ligneId } });
  if (!ligne || ligne.propositionId !== propositionId) {
    return NextResponse.json({ erreur: "Ligne introuvable." }, { status: 404 });
  }

  const correction = validerCorrectionVerre(body);
  const donnees: Record<string, unknown> = { ...correction };

  if ("remisePourcent" in body) {
    if (proposition.statut !== "BROUILLON") {
      return NextResponse.json({ erreur: "Seule une proposition en brouillon peut voir sa remise modifiée." }, { status: 409 });
    }
    const remisePourcent = body.remisePourcent;
    if (remisePourcent !== null && !estRemiseAutorisee(remisePourcent)) {
      return NextResponse.json(
        { erreur: `remisePourcent doit être null ou l'un de : ${REMISES_AUTORISEES.join(", ")}.` },
        { status: 400 },
      );
    }
    donnees.remisePourcent = remisePourcent;
  }

  const ligneMaj = await prisma.propositionLigne.update({ where: { id: ligneId }, data: donnees });

  await journaliser({
    type: "proposition.ligne_correction_modifiee",
    entite: "PropositionLigne",
    entiteId: ligneId,
    personneId: proposition.personneId,
    acteur: session?.email,
    donnees,
  });

  return NextResponse.json(ligneMaj);
}

/**
 * DELETE /api/propositions/:id/lignes/:ligneId — retire une ligne d'une
 * proposition encore en brouillon (une fois envoyée, la proposition est un
 * document tracé et ne se modifie plus).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id: propositionId, ligneId } = await params;

  const proposition = await prisma.proposition.findUnique({ where: { id: propositionId } });
  if (!proposition) {
    return NextResponse.json({ erreur: "Proposition introuvable." }, { status: 404 });
  }
  if (proposition.statut !== "BROUILLON") {
    return NextResponse.json({ erreur: "Seule une proposition en brouillon peut être modifiée." }, { status: 409 });
  }

  const ligne = await prisma.propositionLigne.findUnique({ where: { id: ligneId } });
  if (!ligne || ligne.propositionId !== propositionId) {
    return NextResponse.json({ erreur: "Ligne introuvable." }, { status: 404 });
  }

  await prisma.propositionLigne.delete({ where: { id: ligneId } });

  await journaliser({
    type: "proposition.ligne_retiree",
    entite: "PropositionLigne",
    entiteId: ligneId,
    personneId: proposition.personneId,
    acteur: session?.email,
    donnees: { produitId: ligne.produitId },
  });

  return NextResponse.json({ ok: true });
}
