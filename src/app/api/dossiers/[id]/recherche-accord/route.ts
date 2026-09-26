import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/dossiers/:id/recherche-accord — bouton "🔍 Relancer la
 * recherche" affiché en face d'une demande refusée (ou en attente). Ne fait
 * pas de recherche synchrone dans une boîte mail (ce logiciel ne s'y
 * connecte pas directement — voir /api/automatisations/accord-mutuelle-entrant
 * et lib/traitementMailAccordMutuelle.ts) : déclenche une exécution
 * immédiate du/des scénario(s) Make qui surveillent les boîtes mail
 * concernées, au lieu d'attendre leur prochain passage planifié. Le
 * résultat (document retrouvé, statut mis à jour) apparaîtra sous peu dans
 * ce dossier si un mail correspondant existe, via le webhook ci-dessus.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;

  const personne = await prisma.personne.findUnique({ where: { id } });
  if (!personne) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }

  const apiToken = process.env.MAKE_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json(
      { erreur: "Relance indisponible : MAKE_API_TOKEN n'est pas configuré sur le serveur." },
      { status: 503 },
    );
  }
  const zone = process.env.MAKE_ZONE ?? "eu1.make.com";

  const nomsPlateformes = [personne.mutuelleNom, personne.mutuelle2Nom].filter((n): n is string => Boolean(n)).map((n) => n.toLowerCase());

  const boites = await prisma.boiteMailTiersPayant.findMany({ where: { actif: true, makeScenarioId: { not: null } } });
  const boitesConcernees = boites.filter(
    (b) => b.plateformes.length === 0 || b.plateformes.some((p) => nomsPlateformes.includes(p.toLowerCase())),
  );

  if (boitesConcernees.length === 0) {
    return NextResponse.json(
      { erreur: "Aucune boîte mail configurée (Super Admin > Boîtes mail tiers payant) pour relancer la recherche." },
      { status: 409 },
    );
  }

  const resultats: { boite: string; ok: boolean; erreur?: string }[] = [];
  for (const boite of boitesConcernees) {
    try {
      const reponse = await fetch(`https://${zone}/api/v2/scenarios/${boite.makeScenarioId}/run`, {
        method: "POST",
        headers: { Authorization: `Token ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      resultats.push({ boite: boite.nom, ok: reponse.ok, erreur: reponse.ok ? undefined : `HTTP ${reponse.status}` });
    } catch (e) {
      resultats.push({ boite: boite.nom, ok: false, erreur: e instanceof Error ? e.message : "Erreur réseau." });
    }
  }

  await journaliser({
    type: "demande-mutuelle.recherche_relancee",
    entite: "Personne",
    entiteId: id,
    personneId: id,
    acteur: session?.email,
    donnees: { resultats },
  });

  return NextResponse.json({ declenche: resultats.some((r) => r.ok), resultats });
}
