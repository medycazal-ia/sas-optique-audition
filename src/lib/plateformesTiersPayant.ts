import { prisma } from "@/lib/prisma";

/**
 * Annuaire des plateformes de tiers payant (voir prisma/schema.prisma >
 * model PlateformeTiersPayant) — seeded avec les acteurs majeurs connus du
 * marché optique français, complété au fur et à mesure par la saisie
 * manuelle. Sert à l'autocomplétion et de carnet d'adresses pour l'envoi
 * des demandes de prise en charge.
 */
export async function enregistrerPlateformeSiValide(nom: string | null): Promise<void> {
  if (!nom?.trim()) return;
  await prisma.plateformeTiersPayant.upsert({
    where: { nom: nom.trim() },
    update: {},
    create: { nom: nom.trim() },
  });
}

/** Recherche exacte par nom — pour retrouver le contact (email/téléphone) enregistré. */
export async function trouverPlateformeParNom(nom: string | null) {
  if (!nom?.trim()) return null;
  return prisma.plateformeTiersPayant.findUnique({ where: { nom: nom.trim() } });
}

const RESULTATS_MAX = 10;

/** Recherche "contient", insensible à la casse — pour l'autocomplétion du formulaire mutuelle. */
export async function rechercherPlateformes(q: string) {
  const terme = q.trim();
  if (!terme) {
    return prisma.plateformeTiersPayant.findMany({ orderBy: { nom: "asc" }, take: RESULTATS_MAX });
  }
  return prisma.plateformeTiersPayant.findMany({
    where: { nom: { contains: terme, mode: "insensitive" } },
    orderBy: { nom: "asc" },
    take: RESULTATS_MAX,
  });
}
