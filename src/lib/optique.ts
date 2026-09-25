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

/**
 * Le FINESS (établissement de santé) et le RPPS (praticien) sont chacun
 * une suite de chiffres exacte — 9 pour le FINESS, 11 pour le RPPS, sans
 * lettre ni séparateur (vérifié auprès de sources officielles, voir PR).
 * Tolère les espaces éventuels d'une saisie/OCR ("123 456 789") avant de
 * vérifier la longueur ; toute valeur qui n'a pas exactement le bon
 * nombre de chiffres devient null plutôt qu'être stockée telle quelle.
 */
function validerNumeroChiffres(valeur: unknown, longueur: number): string | null {
  if (typeof valeur !== "string") return null;
  const chiffres = valeur.replace(/\s+/g, "");
  return /^\d+$/.test(chiffres) && chiffres.length === longueur ? chiffres : null;
}

export function validerFiness(valeur: unknown): string | null {
  return validerNumeroChiffres(valeur, 9);
}

export function validerRpps(valeur: unknown): string | null {
  return validerNumeroChiffres(valeur, 11);
}

export type OrdonnanceMesures = {
  sphereOD: number | null;
  cylindreOD: number | null;
  axeOD: number | null;
  additionOD: number | null;
  sphereOG: number | null;
  cylindreOG: number | null;
  axeOG: number | null;
  additionOG: number | null;
  sphereOdModifiee: number | null;
  cylindreOdModifiee: number | null;
  axeOdModifiee: number | null;
  additionOdModifiee: number | null;
  sphereOgModifiee: number | null;
  cylindreOgModifiee: number | null;
  axeOgModifiee: number | null;
  additionOgModifiee: number | null;
  dateModification: Date | string | null;
};

/**
 * Un opticien peut adapter une prescription existante dans certaines
 * limites (décret du 27 mai 2016) — tant qu'une adaptation existe
 * (`dateModification` renseignée), ce sont SES valeurs qui font foi dans
 * tout le logiciel, jamais celles du médecin en même temps : pas de fusion
 * champ par champ, un jeu de mesures complet remplace l'autre.
 */
export function valeursActives(o: OrdonnanceMesures): { od: MesureOeil; og: MesureOeil; source: "opticien" | "medecin" } {
  if (o.dateModification) {
    return {
      od: { sphere: o.sphereOdModifiee, cylindre: o.cylindreOdModifiee, axe: o.axeOdModifiee, addition: o.additionOdModifiee },
      og: { sphere: o.sphereOgModifiee, cylindre: o.cylindreOgModifiee, axe: o.axeOgModifiee, addition: o.additionOgModifiee },
      source: "opticien",
    };
  }
  return {
    od: { sphere: o.sphereOD, cylindre: o.cylindreOD, axe: o.axeOD, addition: o.additionOD },
    og: { sphere: o.sphereOG, cylindre: o.cylindreOG, axe: o.axeOG, addition: o.additionOG },
    source: "medecin",
  };
}
