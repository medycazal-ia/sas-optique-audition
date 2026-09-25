import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { envoyerDemandeParEmail } from "@/lib/emailTiersPayant";
import { trouverPlateformeParNom } from "@/lib/plateformesTiersPayant";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/demandes-mutuelle/:id/envoyer-email — variante automatisée de
 * POST .../envoyer : compose et envoie réellement un email de demande de
 * prise en charge (voir lib/emailTiersPayant.ts), puis effectue la même
 * transition de statut (à envoyer → envoyée). Le destinataire est soit
 * fourni explicitement dans le corps de la requête (saisie manuelle par
 * l'équipe), soit retrouvé dans l'annuaire PlateformeTiersPayant à partir du
 * nom de la plateforme renseignée sur le dossier.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const demande = await prisma.demandePriseEnCharge.findUnique({
    where: { id },
    include: { proposition: { include: { lignes: true, personne: true } } },
  });
  if (!demande) {
    return NextResponse.json({ erreur: "Demande introuvable." }, { status: 404 });
  }
  if (demande.statut !== "A_ENVOYER") {
    return NextResponse.json({ erreur: "Seule une demande à envoyer peut être envoyée." }, { status: 409 });
  }

  const personne = demande.proposition.personne;
  const destinataireSaisi = typeof body.destinataire === "string" ? body.destinataire.trim() : "";
  const plateforme = destinataireSaisi ? null : await trouverPlateformeParNom(personne.mutuellePlateforme);
  const destinataire = destinataireSaisi || plateforme?.emailPro || "";

  if (!destinataire) {
    return NextResponse.json(
      {
        erreur:
          "Aucune adresse email connue pour cette plateforme — renseignez-la dans l'annuaire des plateformes ou saisissez un destinataire.",
      },
      { status: 409 },
    );
  }

  // Le FINESS peut avoir été complété sur l'ordonnance après la création de
  // cette demande (instantané pris à l'acceptation de la proposition) — on
  // relit la dernière ordonnance optique avant d'appliquer le blocage
  // obligatoire (une mutuelle exige le FINESS sur toute demande envoyée).
  const derniereOrdonnance = await prisma.ordonnance.findFirst({
    where: { personneId: demande.personneId, type: "OPTIQUE" },
    orderBy: { dateEmission: "desc" },
    select: { finess: true, rpps: true },
  });
  const finess = demande.finess ?? derniereOrdonnance?.finess ?? null;
  const rpps = demande.rpps ?? derniereOrdonnance?.rpps ?? null;

  if (!finess) {
    return NextResponse.json(
      {
        erreur:
          "FINESS du cabinet prescripteur manquant — complétez l'ordonnance (carte Fiche) avant d'envoyer cette demande.",
      },
      { status: 409 },
    );
  }

  const totalTTC = demande.proposition.lignes.reduce((s, l) => s + l.prixUnitaireTTC * l.quantite, 0);

  try {
    await envoyerDemandeParEmail({
      destinataire,
      reference: demande.id,
      assure: { prenom: personne.prenom, nom: personne.nom, numeroSecuriteSociale: personne.numeroSecuriteSociale },
      mutuelle: {
        nom: personne.mutuelleNom,
        numeroAdherent: personne.mutuelleNumeroAdherent,
        numeroContrat: personne.mutuelleNumeroContrat,
        plateforme: personne.mutuellePlateforme,
      },
      prescripteur: { finess, rpps },
      proposition: {
        creeA: demande.proposition.creeA,
        totalTTC,
        libelles: demande.proposition.lignes.map((l) => `${l.libelleProduit} (x${l.quantite})`),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de l'envoi de l'email.";
    return NextResponse.json({ erreur: message }, { status: 502 });
  }

  const mise_a_jour = await prisma.demandePriseEnCharge.update({
    where: { id },
    data: { statut: "ENVOYEE", envoyeeA: new Date(), canalEnvoi: "email", destinataireEnvoi: destinataire, finess, rpps },
  });

  await journaliser({
    type: "demande-mutuelle.envoyee",
    entite: "DemandePriseEnCharge",
    entiteId: id,
    personneId: demande.personneId,
    acteur: session?.email,
    donnees: { canal: "email", destinataire },
  });

  return NextResponse.json(mise_a_jour);
}
