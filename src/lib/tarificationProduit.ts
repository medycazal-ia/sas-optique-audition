import { parserPrixEnCentimes } from "@/lib/argent";

/**
 * Calcul automatique de la chaîne tarifaire d'un Produit : prix d'achat HT
 * (coût fournisseur, hors taxes) --× coefficient--> prix de vente HT
 * --+ taux TVA--> prix public TTC. Avant cette lib, ces cinq rubriques
 * (prixAchat/coefficient/tauxTva/prixVenteHT/prixTTC) étaient saisies de
 * façon totalement indépendante — aucun recalcul entre elles, contrairement
 * à ce qu'attend un opticien/audioprothésiste de son logiciel de caisse.
 *
 * Principe : à chaque champ modifié par l'utilisateur (`origine`), on
 * recalcule uniquement les rubriques qui s'en déduisent, dans le sens
 * cohérent avec ce champ — jamais `origine` lui-même, pour ne jamais
 * écraser une saisie manuelle en cours. L'utilisateur reste toujours libre
 * de resaisir n'importe quel champ ensuite (rien n'est verrouillé).
 */

export type ChampTarif = "prixAchat" | "coefficient" | "tauxTva" | "prixVenteHT" | "prixTTC";

export type ValeursTarif = {
  prixAchat: number | null; // centimes — coût fournisseur HT
  coefficient: number | null;
  tauxTva: number | null; // fraction, ex. 0.2 pour 20 %
  prixVenteHT: number | null; // centimes
  prixTTC: number | null; // centimes — prix public
};

function arrondirCentimes(valeur: number): number {
  return Math.round(valeur);
}

function arrondirCoefficient(valeur: number): number {
  return Math.round(valeur * 10000) / 10000;
}

export function recalculerTarif(valeurs: ValeursTarif, origine: ChampTarif): ValeursTarif {
  const v = { ...valeurs };
  if (v[origine] === null) return v; // champ vidé : rien à en déduire, on laisse le reste tel quel

  const { prixAchat, coefficient, tauxTva } = v;
  const achatConnu = prixAchat != null && prixAchat > 0;

  switch (origine) {
    case "prixAchat":
    case "coefficient":
      if (achatConnu && coefficient != null) {
        v.prixVenteHT = arrondirCentimes(prixAchat! * coefficient);
      }
      if (v.prixVenteHT != null && tauxTva != null) {
        v.prixTTC = arrondirCentimes(v.prixVenteHT * (1 + tauxTva));
      }
      break;

    case "tauxTva":
      if (v.prixVenteHT != null && tauxTva != null) {
        v.prixTTC = arrondirCentimes(v.prixVenteHT * (1 + tauxTva));
      } else if (v.prixTTC != null && tauxTva != null) {
        v.prixVenteHT = arrondirCentimes(v.prixTTC / (1 + tauxTva));
        if (achatConnu) v.coefficient = arrondirCoefficient(v.prixVenteHT / prixAchat!);
      }
      break;

    case "prixVenteHT":
      if (achatConnu) v.coefficient = arrondirCoefficient(v.prixVenteHT! / prixAchat!);
      if (tauxTva != null) v.prixTTC = arrondirCentimes(v.prixVenteHT! * (1 + tauxTva));
      break;

    case "prixTTC":
      if (tauxTva != null) {
        v.prixVenteHT = arrondirCentimes(v.prixTTC! / (1 + tauxTva));
        if (achatConnu) v.coefficient = arrondirCoefficient(v.prixVenteHT / prixAchat!);
      }
      break;
  }

  return v;
}

/**
 * Complète (sans jamais écraser une valeur déjà fournie) les rubriques
 * tarifaires manquantes mais déductibles des autres — utilisé côté serveur
 * (API produit, import CSV) en complément du recalcul en direct côté UI, de
 * sorte que l'automatisation s'applique aussi à un appel API direct ou un
 * import partiel, pas seulement à la saisie via le formulaire.
 */
export function completerTarif(valeurs: ValeursTarif): ValeursTarif {
  const v = { ...valeurs };
  const achatConnu = v.prixAchat != null && v.prixAchat > 0;

  if (v.prixVenteHT == null && achatConnu && v.coefficient != null) {
    v.prixVenteHT = arrondirCentimes(v.prixAchat! * v.coefficient);
  }
  if (v.prixVenteHT == null && v.prixTTC != null && v.tauxTva != null) {
    v.prixVenteHT = arrondirCentimes(v.prixTTC / (1 + v.tauxTva));
  }
  if (v.prixTTC == null && v.prixVenteHT != null && v.tauxTva != null) {
    v.prixTTC = arrondirCentimes(v.prixVenteHT * (1 + v.tauxTva));
  }
  if (v.coefficient == null && achatConnu && v.prixVenteHT != null) {
    v.coefficient = arrondirCoefficient(v.prixVenteHT / v.prixAchat!);
  }

  return v;
}

/** Formate un montant en centimes vers une saisie euros ("108,25"), ou "" si absent. */
export function formaterCentimesPourChamp(centimes: number | null): string {
  return centimes == null ? "" : (centimes / 100).toFixed(2).replace(".", ",");
}

/** Formate un coefficient/nombre décimal libre vers une saisie ("2,5"), ou "" si absent. */
export function formaterNombrePourChamp(valeur: number | null): string {
  return valeur == null ? "" : String(valeur).replace(".", ",");
}

/** Formate une fraction (0.2) vers un pourcentage de saisie ("20"), ou "" si absent. */
export function formaterPourcentagePourChamp(fraction: number | null): string {
  return fraction == null ? "" : String(Math.round(fraction * 10000) / 100).replace(".", ",");
}

/** Parse une saisie euros ("108,25") vers des centimes, ou null si vide/invalide. */
export function parserCentimesPourChamp(saisie: string): number | null {
  if (!saisie.trim()) return null;
  return parserPrixEnCentimes(saisie);
}

/** Parse une saisie décimale libre ("2,5") vers un nombre, ou null si vide/invalide. */
export function parserNombrePourChamp(saisie: string): number | null {
  if (!saisie.trim()) return null;
  const n = Number(saisie.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Parse une saisie pourcentage ("20") vers une fraction (0.2), ou null si vide/invalide. */
export function parserPourcentagePourChamp(saisie: string): number | null {
  const n = parserNombrePourChamp(saisie);
  return n === null ? null : n / 100;
}
