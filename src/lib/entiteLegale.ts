/**
 * Validation et complétude des fiches Societe/Magasin — mentions légales
 * obligatoires pour un opticien-lunetier et/ou un audioprothésiste
 * (Code de la santé publique, Code de commerce). "Si un champ reste vide,
 * demander de le remplir" : voir champsObligatoiresManquantsSociete/Magasin,
 * utilisées pour la bannière d'alerte du Super Admin plutôt que de bloquer
 * la saisie (les rubriques restent toutes modifiables à tout moment).
 */

/** SIRET : 14 chiffres exactement, sans espace ni lettre — le SIREN est ses 9 premiers chiffres. */
export function validerSiret(valeur: unknown): string | null {
  if (typeof valeur !== "string") return null;
  const chiffres = valeur.replace(/\s+/g, "");
  return /^\d{14}$/.test(chiffres) ? chiffres : null;
}

export type DonneesSociete = {
  raisonSociale: string | null;
  formeJuridique: string | null;
  siret: string | null;
  numeroTvaIntracommunautaire: string | null;
  rcs: string | null;
  capitalSocial: string | null;
  codeApe: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  siteWeb: string | null;
  representantLegal: string | null;
  numeroFiness: string | null;
  assuranceRcProNom: string | null;
  assuranceRcProNumero: string | null;
  iban: string | null;
  bic: string | null;
};

export type DonneesMagasin = {
  nom: string;
  ville: string | null;
  adresse: string | null;
  codePostal: string | null;
  telephone: string | null;
  email: string | null;
  siret: string | null;
  finess: string | null;
  numeroAgrementOptique: string | null;
  numeroAgrementAudio: string | null;
  responsable: string | null;
};

const LIBELLES_SOCIETE: Record<string, string> = {
  raisonSociale: "Raison sociale",
  formeJuridique: "Forme juridique",
  siret: "SIRET",
  numeroTvaIntracommunautaire: "N° de TVA intracommunautaire",
  rcs: "RCS",
  adresse: "Adresse du siège",
  codePostal: "Code postal",
  ville: "Ville",
  telephone: "Téléphone",
  email: "Email",
  representantLegal: "Représentant légal",
  assuranceRcProNom: "Assureur RC Pro",
  assuranceRcProNumero: "N° de police RC Pro",
};

/** Champs obligatoires pour l'exercice réel — capitalSocial/codeApe/numeroFiness/siteWeb/iban/bic restent optionnels (variables selon la forme juridique ou centralisés par magasin). Accepte aussi bien les valeurs venues de la base (null) que d'un formulaire (chaîne vide). */
export function champsObligatoiresManquantsSociete(s: Record<string, string | null | undefined>): string[] {
  return Object.entries(LIBELLES_SOCIETE)
    .filter(([cle]) => !s[cle]?.trim())
    .map(([, libelle]) => libelle);
}

const LIBELLES_MAGASIN: Record<string, string> = {
  nom: "Nom du magasin",
  adresse: "Adresse",
  codePostal: "Code postal",
  ville: "Ville",
  telephone: "Téléphone",
  finess: "N° FINESS",
};

/** Au moins un des deux numéros d'agrément (optique ou audio) est requis, selon l'activité du magasin — jamais les deux si un seul est pratiqué. */
export function champsObligatoiresManquantsMagasin(m: Record<string, string | null | undefined>): string[] {
  const manquants = Object.entries(LIBELLES_MAGASIN)
    .filter(([cle]) => !m[cle]?.trim())
    .map(([, libelle]) => libelle);
  if (!m.numeroAgrementOptique?.trim() && !m.numeroAgrementAudio?.trim()) {
    manquants.push("N° d'agrément opticien-lunetier ou audioprothésiste");
  }
  return manquants;
}
