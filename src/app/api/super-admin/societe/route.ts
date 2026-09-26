import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";
import { validerSiret } from "@/lib/entiteLegale";

/** Identifiant fixe : Societe est un singleton applicatif, voir modèle Prisma. */
const ID_SINGLETON = "singleton";

const CHAMPS_TEXTE = [
  "raisonSociale",
  "formeJuridique",
  "numeroTvaIntracommunautaire",
  "rcs",
  "capitalSocial",
  "codeApe",
  "adresse",
  "codePostal",
  "ville",
  "telephone",
  "email",
  "siteWeb",
  "representantLegal",
  "numeroFiness",
  "assuranceRcProNom",
  "assuranceRcProNumero",
  "iban",
  "bic",
] as const;

/**
 * GET /api/super-admin/societe — fiche de l'entité juridique (singleton).
 * Renvoie un objet vide (tous champs null) tant qu'elle n'a jamais été
 * enregistrée, plutôt qu'une 404 — la carte Super Admin doit pouvoir
 * afficher un formulaire à remplir dès le premier chargement.
 */
export async function GET() {
  const societe = await prisma.societe.findUnique({ where: { id: ID_SINGLETON } });
  return NextResponse.json(
    societe ?? {
      id: ID_SINGLETON,
      raisonSociale: null,
      formeJuridique: null,
      siret: null,
      numeroTvaIntracommunautaire: null,
      rcs: null,
      capitalSocial: null,
      codeApe: null,
      adresse: null,
      codePostal: null,
      ville: null,
      telephone: null,
      email: null,
      siteWeb: null,
      representantLegal: null,
      numeroFiness: null,
      assuranceRcProNom: null,
      assuranceRcProNumero: null,
      iban: null,
      bic: null,
    },
  );
}

/** PUT /api/super-admin/societe — création/mise à jour complète (upsert sur l'id fixe), réservé au Super Admin. */
export async function PUT(request: NextRequest) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const body = await request.json();

  const donnees: Record<string, unknown> = {};
  for (const champ of CHAMPS_TEXTE) {
    if (champ in body) donnees[champ] = typeof body[champ] === "string" ? body[champ].trim() || null : null;
  }
  if ("siret" in body) {
    const siret = typeof body.siret === "string" && body.siret.trim() ? validerSiret(body.siret) : null;
    if (body.siret && !siret) {
      return NextResponse.json({ erreur: "SIRET invalide (14 chiffres attendus)." }, { status: 400 });
    }
    donnees.siret = siret;
  }

  let societe;
  try {
    societe = await prisma.societe.upsert({
      where: { id: ID_SINGLETON },
      update: donnees,
      create: { id: ID_SINGLETON, ...donnees },
    });
  } catch (erreur: unknown) {
    if (erreur && typeof erreur === "object" && "code" in erreur && erreur.code === "P2002") {
      return NextResponse.json({ erreur: "Ce SIRET est déjà utilisé." }, { status: 409 });
    }
    throw erreur;
  }

  await journaliser({
    type: "societe.modifiee",
    entite: "Societe",
    entiteId: societe.id,
    acteur: session?.email,
    donnees,
  });

  return NextResponse.json(societe);
}
