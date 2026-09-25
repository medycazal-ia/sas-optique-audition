import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/dossiers/:id/mutuelle — endpoint dédié module Mutuelle & tiers
 * payant. Deux usages exclusifs :
 * - renseigner mutuelleNom/mutuelleNumeroAdherent (efface un refus antérieur,
 *   le client a changé d'avis) ;
 * - { refuser: true } : trace un refus explicite du client de la renseigner
 *   (critère d'acceptation V1 — le blocage du reste à charge ne s'applique
 *   plus mais le refus reste tracé, horodaté).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const maintenant = new Date();
  const donnees: Record<string, unknown> = {};

  if (body.refuser === true) {
    donnees.mutuelleRefuseeA = maintenant;
  } else if (typeof body.mutuelleNom === "string") {
    const nom = body.mutuelleNom.trim();
    if (!nom) {
      return NextResponse.json({ erreur: "mutuelleNom ne peut pas être vide." }, { status: 400 });
    }
    donnees.mutuelleNom = nom;
    donnees.mutuelleNumeroAdherent =
      typeof body.mutuelleNumeroAdherent === "string" ? body.mutuelleNumeroAdherent.trim() || null : null;
    donnees.mutuelleRenseigneeA = maintenant;
    donnees.mutuelleRefuseeA = null;
  } else {
    return NextResponse.json(
      { erreur: "Préciser mutuelleNom (+ mutuelleNumeroAdherent) ou refuser: true." },
      { status: 400 },
    );
  }

  const personne = await prisma.personne.update({ where: { id }, data: donnees });

  await journaliser({
    type: body.refuser === true ? "mutuelle.refusee" : "mutuelle.renseignee",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: session?.email,
    donnees,
  });

  return NextResponse.json(personne);
}
