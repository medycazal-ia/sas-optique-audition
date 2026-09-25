import { prisma } from "@/lib/prisma";

/**
 * Annuaire des cabinets déjà rencontrés (voir prisma/schema.prisma >
 * model Cabinet) — alimenté au fur et à mesure des ordonnances créées ou
 * corrigées (OCR ou saisie manuelle), pour permettre une recherche/
 * autocomplétion plutôt que de tout retaper à chaque fois. Un cabinet n'y
 * entre que si un FINESS déjà validé (9 chiffres, voir lib/optique.ts) est
 * fourni — c'est la seule clé qui l'identifie ; sans FINESS, rien n'est
 * archivé (mais le nom brut reste stocké sur l'ordonnance elle-même).
 */
export async function enregistrerCabinetSiValide(nom: string | null, finess: string | null): Promise<void> {
  if (!finess || !nom?.trim()) return;
  await prisma.cabinet.upsert({
    where: { finess },
    update: { nom: nom.trim() },
    create: { nom: nom.trim(), finess },
  });
}

const RESULTATS_MAX = 10;

/**
 * Recherche pour l'autocomplétion du formulaire de correction — par
 * FINESS en préfixe (naturellement tapé depuis le début), mais par nom en
 * "contient" plutôt qu'en préfixe : un nom de cabinet commence souvent par
 * un mot générique ("Cabinet", "Centre", "Docteur"...) que personne ne
 * tape en premier, on cherche donc plutôt le mot distinctif.
 */
export async function rechercherCabinets(q: string) {
  const terme = q.trim();
  if (!terme) return [];
  return prisma.cabinet.findMany({
    where: {
      OR: [{ nom: { contains: terme, mode: "insensitive" } }, { finess: { startsWith: terme } }],
    },
    orderBy: { nom: "asc" },
    take: RESULTATS_MAX,
  });
}
