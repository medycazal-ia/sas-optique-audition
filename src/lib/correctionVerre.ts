import { parserMesureOeil, type MesureOeil } from "@/lib/optique";

/**
 * Correction optique portée par une ligne de proposition/commande
 * (catégorie VERRE) — mêmes 8 champs que sur Ordonnance, mais à plat (pas
 * de distinction médecin/opticien ici : une seule valeur par ligne,
 * modifiable directement). Module client-safe (aucun import Prisma) —
 * voir lib/correctionVerrePrefill.ts pour le préremplissage serveur.
 */
export type CorrectionVerre = {
  sphereOD: number | null;
  cylindreOD: number | null;
  axeOD: number | null;
  additionOD: number | null;
  sphereOG: number | null;
  cylindreOG: number | null;
  axeOG: number | null;
  additionOG: number | null;
};

export function correctionVide(): CorrectionVerre {
  return {
    sphereOD: null,
    cylindreOD: null,
    axeOD: null,
    additionOD: null,
    sphereOG: null,
    cylindreOG: null,
    axeOG: null,
    additionOG: null,
  };
}

export function correctionEstRenseignee(c: CorrectionVerre): boolean {
  return Object.values(c).some((v) => v !== null);
}

/** Valide/borne une correction saisie (formulaire d'édition) — même logique que la saisie d'ordonnance (lib/optique.ts). */
export function validerCorrectionVerre(source: unknown): CorrectionVerre {
  if (typeof source !== "object" || source === null) return correctionVide();
  const s = source as Record<string, unknown>;
  const od = parserMesureOeil(s.od);
  const og = parserMesureOeil(s.og);
  return {
    sphereOD: od.sphere,
    cylindreOD: od.cylindre,
    axeOD: od.axe,
    additionOD: od.addition,
    sphereOG: og.sphere,
    cylindreOG: og.cylindre,
    axeOG: og.axe,
    additionOG: og.addition,
  };
}

function formaterOeil(m: MesureOeil, label: string): string | null {
  if (m.sphere === null && m.cylindre === null && m.axe === null && m.addition === null) return null;
  const parties: string[] = [];
  if (m.sphere !== null) parties.push(`sphère ${m.sphere > 0 ? "+" : ""}${m.sphere}`);
  if (m.cylindre !== null) parties.push(`cylindre ${m.cylindre > 0 ? "+" : ""}${m.cylindre}`);
  if (m.axe !== null) parties.push(`axe ${m.axe}°`);
  if (m.addition !== null) parties.push(`addition +${m.addition}`);
  return `${label} : ${parties.join(", ")}`;
}

/** Reprend la correction sous forme de texte lisible (une ligne), pour l'UI — null si rien n'est renseigné. */
export function formaterCorrectionVerre(c: CorrectionVerre): string | null {
  const [od, og] = formaterCorrectionVerreParOeil(c);
  const parties = [od, og].filter((p): p is string => p !== null);
  return parties.length > 0 ? parties.join(" · ") : null;
}

/** Même chose mais OD et OG séparés (une ligne chacun) — pour les PDF, où une seule ligne combinée déborderait. */
export function formaterCorrectionVerreParOeil(c: CorrectionVerre): [string | null, string | null] {
  const od = formaterOeil({ sphere: c.sphereOD, cylindre: c.cylindreOD, axe: c.axeOD, addition: c.additionOD }, "OD");
  const og = formaterOeil({ sphere: c.sphereOG, cylindre: c.cylindreOG, axe: c.axeOG, addition: c.additionOG }, "OG");
  return [od, og];
}
