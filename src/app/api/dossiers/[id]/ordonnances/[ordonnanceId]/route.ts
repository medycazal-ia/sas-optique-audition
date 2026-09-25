import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { parserMesureOeil } from "@/lib/optique";

type RouteParams = { params: Promise<{ id: string; ordonnanceId: string }> };

/**
 * PATCH /api/dossiers/:id/ordonnances/:ordonnanceId — correction manuelle
 * des mesures (après une extraction OCR ou une saisie initiale). Efface
 * `extraitParOcrA` : une fois relue/corrigée par un humain, la valeur n'est
 * plus "à vérifier".
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id, ordonnanceId } = await params;

  const existante = await prisma.ordonnance.findUnique({ where: { id: ordonnanceId } });
  if (!existante || existante.personneId !== id) {
    return NextResponse.json({ erreur: "Ordonnance introuvable pour ce dossier." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const od = parserMesureOeil(body.od);
  const og = parserMesureOeil(body.og);

  const ordonnance = await prisma.ordonnance.update({
    where: { id: ordonnanceId },
    data: {
      ...(typeof body.dateEmission === "string" && body.dateEmission ? { dateEmission: new Date(body.dateEmission) } : {}),
      ...(typeof body.emisePar === "string" ? { emisePar: body.emisePar.trim() || null } : {}),
      sphereOD: od.sphere,
      cylindreOD: od.cylindre,
      axeOD: od.axe,
      additionOD: od.addition,
      sphereOG: og.sphere,
      cylindreOG: og.cylindre,
      axeOG: og.axe,
      additionOG: og.addition,
      extraitParOcrA: null,
    },
  });

  await journaliser({
    type: "ordonnance.corrigee",
    entite: "Ordonnance",
    entiteId: ordonnance.id,
    personneId: id,
    acteur: session?.email,
  });

  return NextResponse.json(ordonnance);
}
