import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";
import { lireSession } from "@/lib/auth";
import { parserMesureOeil, validerFiness, validerRpps } from "@/lib/optique";
import { enregistrerCabinetSiValide } from "@/lib/cabinets";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/dossiers/:id/ordonnances — saisie manuelle d'une correction
 * optique (sphère/cylindre/axe/addition par œil), sans passer par un scan
 * ni l'OCR — utile quand le praticien communique les valeurs autrement
 * qu'en scannant une ordonnance, ou pour corriger une extraction
 * automatique en repartant de zéro.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await lireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const dateEmission = typeof body.dateEmission === "string" && body.dateEmission ? new Date(body.dateEmission) : new Date();
  const emisePar = typeof body.emisePar === "string" && body.emisePar.trim() ? body.emisePar.trim() : null;
  const cabinetNom = typeof body.cabinetNom === "string" && body.cabinetNom.trim() ? body.cabinetNom.trim() : null;
  const finess = validerFiness(body.finess);
  const rpps = validerRpps(body.rpps);
  const od = parserMesureOeil(body.od);
  const og = parserMesureOeil(body.og);

  const modification = body.modification ?? {};
  const dateModification =
    typeof modification.dateModification === "string" && modification.dateModification
      ? new Date(modification.dateModification)
      : null;
  const modifieePar =
    typeof modification.modifieePar === "string" && modification.modifieePar.trim() ? modification.modifieePar.trim() : null;
  const odModifiee = dateModification ? parserMesureOeil(modification.od) : { sphere: null, cylindre: null, axe: null, addition: null };
  const ogModifiee = dateModification ? parserMesureOeil(modification.og) : { sphere: null, cylindre: null, axe: null, addition: null };

  const ordonnance = await prisma.ordonnance.create({
    data: {
      personneId: id,
      type: "OPTIQUE",
      dateEmission,
      emisePar,
      cabinetNom,
      finess,
      rpps,
      sphereOD: od.sphere,
      cylindreOD: od.cylindre,
      axeOD: od.axe,
      additionOD: od.addition,
      sphereOG: og.sphere,
      cylindreOG: og.cylindre,
      axeOG: og.axe,
      additionOG: og.addition,
      dateModification,
      modifieePar,
      sphereOdModifiee: odModifiee.sphere,
      cylindreOdModifiee: odModifiee.cylindre,
      axeOdModifiee: odModifiee.axe,
      additionOdModifiee: odModifiee.addition,
      sphereOgModifiee: ogModifiee.sphere,
      cylindreOgModifiee: ogModifiee.cylindre,
      axeOgModifiee: ogModifiee.axe,
      additionOgModifiee: ogModifiee.addition,
    },
  });

  await enregistrerCabinetSiValide(cabinetNom, finess);

  await journaliser({
    type: "ordonnance.creee",
    entite: "Ordonnance",
    entiteId: ordonnance.id,
    personneId: id,
    acteur: session?.email,
  });

  return NextResponse.json(ordonnance, { status: 201 });
}
