import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/livraisons/:id/ajustement — remise → ajustement demandé.
 * "Un ajustement fait au moment de la remise est enregistré dans le
 * dossier" (critère d'acceptation V1, utile pour un futur module SAV).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json();

  const note = typeof body.ajustementDemande === "string" ? body.ajustementDemande.trim() : "";
  if (!note) {
    return NextResponse.json({ erreur: "ajustementDemande (texte) requis." }, { status: 400 });
  }

  const livraison = await prisma.livraison.findUnique({ where: { id } });
  if (!livraison) {
    return NextResponse.json({ erreur: "Livraison introuvable." }, { status: 404 });
  }
  if (livraison.statut !== "REMISE") {
    return NextResponse.json({ erreur: "Seule une livraison remise peut recevoir une demande d'ajustement." }, { status: 409 });
  }

  const mise_a_jour = await prisma.livraison.update({
    where: { id },
    data: { statut: "AJUSTEMENT_DEMANDE", ajustementDemande: note, ajustementDemandeA: new Date() },
  });

  await journaliser({
    type: "livraison.ajustement_demande",
    entite: "Livraison",
    entiteId: id,
    personneId: livraison.personneId,
    acteur: session?.email,
    donnees: { ajustementDemande: note },
  });

  return NextResponse.json(mise_a_jour);
}
