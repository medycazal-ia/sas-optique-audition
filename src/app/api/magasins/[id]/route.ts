import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession, sessionEstDirecteurOuPlus } from "@/lib/auth";
import { validerSiret } from "@/lib/entiteLegale";

type RouteParams = { params: Promise<{ id: string }> };

const CHAMPS_TEXTE = [
  "ville",
  "adresse",
  "codePostal",
  "telephone",
  "email",
  "finess",
  "numeroAgrementOptique",
  "numeroAgrementAudio",
  "responsable",
] as const;

/**
 * PATCH /api/magasins/:id — modifie la fiche d'un point de vente (nom et
 * toutes les rubriques légales/opérationnelles — adresse, FINESS, numéros
 * d'agrément...), réservé à un DIRECTEUR ou plus.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!sessionEstDirecteurOuPlus(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();

  const donnees: Record<string, unknown> = {};
  if (typeof body.nom === "string" && body.nom.trim()) donnees.nom = body.nom.trim();
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

  if (Object.keys(donnees).length === 0) {
    return NextResponse.json({ erreur: "Aucun champ valide à mettre à jour." }, { status: 400 });
  }

  const magasin = await prisma.magasin.update({ where: { id }, data: donnees }).catch(() => null);
  if (!magasin) {
    return NextResponse.json({ erreur: "Magasin introuvable." }, { status: 404 });
  }

  await journaliser({
    type: "magasin.modifie",
    entite: "Magasin",
    entiteId: id,
    acteur: session?.email,
    donnees,
  });

  return NextResponse.json(magasin);
}

/**
 * DELETE /api/magasins/:id — supprime un point de vente, réservé à un
 * DIRECTEUR ou plus. Bloqué (409) tant qu'un stock ou un compte utilisateur
 * y est encore rattaché — jamais de suppression qui perdrait cette
 * traçabilité silencieusement.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  if (!sessionEstDirecteurOuPlus(session)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 403 });
  }
  const { id } = await params;

  const [stocksLies, utilisateursLies] = await Promise.all([
    prisma.stock.count({ where: { magasinId: id } }),
    prisma.utilisateur.count({ where: { magasinId: id } }),
  ]);
  if (stocksLies > 0 || utilisateursLies > 0) {
    return NextResponse.json(
      { erreur: "Ce magasin a encore du stock ou des comptes rattachés — impossible à supprimer." },
      { status: 409 },
    );
  }

  const magasin = await prisma.magasin.delete({ where: { id } }).catch(() => null);
  if (!magasin) {
    return NextResponse.json({ erreur: "Magasin introuvable." }, { status: 404 });
  }

  await journaliser({
    type: "magasin.supprime",
    entite: "Magasin",
    entiteId: id,
    acteur: session?.email,
    donnees: { nom: magasin.nom },
  });

  return NextResponse.json({ ok: true });
}
