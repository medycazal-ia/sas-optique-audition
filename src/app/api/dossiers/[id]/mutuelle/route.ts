import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { enregistrerPlateformeSiValide } from "@/lib/plateformesTiersPayant";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/dossiers/:id/mutuelle — endpoint dédié module Mutuelle & tiers
 * payant. `rang: "SECONDAIRE"` cible la mutuelle secondaire/surcomplémentaire
 * (mêmes règles que la principale, champs mutuelle2* — voir modèle Personne)
 * ; par défaut ("PRINCIPALE") cible la mutuelle principale. Deux usages
 * exclusifs par rang :
 * - renseigner {mutuelleNom, ...} (efface un refus antérieur, le client a
 *   changé d'avis) ;
 * - { refuser: true } : trace un refus explicite du client de la renseigner
 *   (critère d'acceptation V1 — le blocage du reste à charge ne s'applique
 *   plus mais le refus reste tracé, horodaté). Non applicable à la
 *   secondaire (jamais bloquante en elle-même) — refuser: true avec
 *   rang: "SECONDAIRE" trace quand même le refus, sans effet sur un blocage.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const secondaire = body.rang === "SECONDAIRE";
  const prefixe = secondaire ? "mutuelle2" : "mutuelle";
  const maintenant = new Date();
  const donnees: Record<string, unknown> = {};

  if (body.refuser === true) {
    donnees[`${prefixe}RefuseeA`] = maintenant;
  } else if (typeof body.mutuelleNom === "string") {
    const nom = body.mutuelleNom.trim();
    if (!nom) {
      return NextResponse.json({ erreur: "mutuelleNom ne peut pas être vide." }, { status: 400 });
    }
    donnees[`${prefixe}Nom`] = nom;
    donnees[`${prefixe}NumeroAdherent`] =
      typeof body.mutuelleNumeroAdherent === "string" ? body.mutuelleNumeroAdherent.trim() || null : null;
    donnees[`${prefixe}NumeroContrat`] =
      typeof body.mutuelleNumeroContrat === "string" ? body.mutuelleNumeroContrat.trim() || null : null;
    const plateforme = typeof body.mutuellePlateforme === "string" ? body.mutuellePlateforme.trim() || null : null;
    donnees[`${prefixe}Plateforme`] = plateforme;
    donnees[`${prefixe}RenseigneeA`] = maintenant;
    donnees[`${prefixe}RefuseeA`] = null;
    if (!secondaire) donnees.mutuelleExtraitParOcrA = null; // saisie/corrigée à la main : ce n'est plus "à vérifier" — l'OCR ne cible que la principale
    await enregistrerPlateformeSiValide(plateforme);
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
    donnees: { ...donnees, rang: secondaire ? "SECONDAIRE" : "PRINCIPALE" },
  });

  return NextResponse.json(personne);
}
