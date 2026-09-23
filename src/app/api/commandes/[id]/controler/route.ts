import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/commandes/:id/controler — reçue → contrôlée.
 * Permet de renseigner le numéro de série par ligne (traçabilité — utile
 * notamment pour les appareils auditifs). Déclenche automatiquement la
 * Livraison associée (statut "programmée") pour ne jamais perdre l'étape
 * suivante de la chaîne.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const commande = await prisma.commande.findUnique({ where: { id }, include: { lignes: true } });
  if (!commande) {
    return NextResponse.json({ erreur: "Commande introuvable." }, { status: 404 });
  }
  if (commande.statut !== "RECUE") {
    return NextResponse.json({ erreur: "Seule une commande reçue peut être contrôlée." }, { status: 409 });
  }

  const numerosSerie: Array<{ ligneId: string; numeroSerie: string }> = Array.isArray(body.lignes)
    ? body.lignes.filter(
        (l: unknown): l is { ligneId: string; numeroSerie: string } =>
          typeof l === "object" && l !== null && typeof (l as { ligneId?: unknown }).ligneId === "string" &&
          typeof (l as { numeroSerie?: unknown }).numeroSerie === "string",
      )
    : [];

  const idsValides = new Set(commande.lignes.map((l) => l.id));
  for (const { ligneId, numeroSerie } of numerosSerie) {
    if (!idsValides.has(ligneId)) continue;
    await prisma.commandeLigne.update({ where: { id: ligneId }, data: { numeroSerie: numeroSerie.trim() || null } });
  }

  const [mise_a_jour, livraison] = await prisma.$transaction([
    prisma.commande.update({ where: { id }, data: { statut: "CONTROLEE", controleeA: new Date() } }),
    prisma.livraison.create({ data: { commandeId: id, personneId: commande.personneId } }),
  ]);

  await journaliser({
    type: "commande.controlee",
    entite: "Commande",
    entiteId: id,
    personneId: commande.personneId,
    acteur: session?.email,
    donnees: { numerosSerieRenseignes: numerosSerie.length },
  });
  await journaliser({
    type: "livraison.creee",
    entite: "Livraison",
    entiteId: livraison.id,
    personneId: commande.personneId,
    acteur: session?.email,
  });

  return NextResponse.json(mise_a_jour);
}
