import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { produitsSuggeresPourBesoins, type BesoinsExprimes } from "@/lib/besoinsExprimes";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/dossiers/:id/besoins/produits-suggeres — verres/montures du
 * catalogue correspondant aux besoins exprimés déjà enregistrés pour ce
 * dossier (voir carte Audit / lib/besoinsExprimes.ts). Recherche textuelle
 * "au mieux" sur le catalogue existant — voir le commentaire de
 * produitsSuggeresPourBesoins pour les limites (pas un filtre garanti).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const personne = await prisma.personne.findUnique({
    where: { id },
    select: { visionBesoin: true, traitementsVerreBesoin: true, matiereMontureBesoin: true, styleBesoin: true },
  });
  if (!personne) {
    return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  }

  const besoins: BesoinsExprimes = {
    vision: personne.visionBesoin as BesoinsExprimes["vision"],
    traitementsVerre: personne.traitementsVerreBesoin as BesoinsExprimes["traitementsVerre"],
    matiereMonture: personne.matiereMontureBesoin as BesoinsExprimes["matiereMonture"],
    style: personne.styleBesoin as BesoinsExprimes["style"],
  };

  const suggestions = await produitsSuggeresPourBesoins(besoins);
  return NextResponse.json(suggestions);
}
