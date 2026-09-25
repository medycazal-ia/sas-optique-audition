export type MesureOeil = {
  sphere: number | null;
  cylindre: number | null;
  axe: number | null;
  addition: number | null;
};

/**
 * Transposition cylindre négatif → cylindre positif — convention française :
 * l'ophtalmologiste prescrit en cylindre négatif, le verrier/opticien
 * travaille en cylindre positif sur sa fiche technique. Formule vérifiée
 * auprès de sources professionnelles (voir PR) :
 * - nouvelle sphère = sphère + cylindre
 * - nouveau cylindre = -cylindre
 * - nouvel axe = axe ± 90°, ramené entre 0° et 180°
 * Ex. -1.50 (-0.50) 0° devient -2.00 (+0.50) 90°.
 *
 * Ne transpose que si les trois mesures (sphère, cylindre, axe) sont
 * connues — un œil sans correction (mesures nulles) ou partiellement lu
 * par l'OCR est renvoyé tel quel plutôt que de produire un résultat faux.
 */
export function transposerCylindrePositif(mesure: MesureOeil): MesureOeil {
  if (mesure.sphere === null || mesure.cylindre === null || mesure.axe === null) {
    return mesure;
  }
  const nouvelAxe = mesure.axe <= 90 ? mesure.axe + 90 : mesure.axe - 90;
  return {
    sphere: arrondirQuartDioptrie(mesure.sphere + mesure.cylindre),
    cylindre: arrondirQuartDioptrie(-mesure.cylindre),
    axe: nouvelAxe,
    addition: mesure.addition,
  };
}

/** Les corrections optiques se prescrivent par quart de dioptrie (0,25). */
function arrondirQuartDioptrie(valeur: number): number {
  return Math.round(valeur * 4) / 4;
}

/** Bornes plausibles d'une correction optique humaine — au-delà, une valeur OCR est presque sûrement une erreur de lecture plutôt qu'une vraie mesure. */
export const BORNES_MESURE = {
  sphere: { min: -30, max: 30 },
  cylindre: { min: -10, max: 10 },
  axe: { min: 0, max: 180 },
  addition: { min: 0, max: 5 },
} as const;

function bornerNombre(valeur: unknown, bornes: { min: number; max: number }): number | null {
  const n = typeof valeur === "string" ? Number(valeur.replace(",", ".")) : valeur;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (n < bornes.min || n > bornes.max) return null;
  return n;
}

/**
 * Parse/valide une mesure d'œil venant de n'importe quelle source (saisie
 * manuelle d'un formulaire ou réponse de l'OCR) de la même façon — une
 * valeur hors bornes ou non numérique devient null plutôt que d'être
 * silencieusement acceptée.
 */
export function parserMesureOeil(source: unknown): MesureOeil {
  if (typeof source !== "object" || source === null) {
    return { sphere: null, cylindre: null, axe: null, addition: null };
  }
  const m = source as Record<string, unknown>;
  return {
    sphere: bornerNombre(m.sphere, BORNES_MESURE.sphere),
    cylindre: bornerNombre(m.cylindre, BORNES_MESURE.cylindre),
    axe: bornerNombre(m.axe, BORNES_MESURE.axe),
    addition: bornerNombre(m.addition, BORNES_MESURE.addition),
  };
}
