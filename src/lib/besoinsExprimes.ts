import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Taxonomie fermée des besoins qu'on peut extraire d'une conversation avec
 * un client (carte Audit, voir DossierDetailClient.tsx) — un ensemble fixe
 * de valeurs plutôt que du texte libre, pour pouvoir ensuite suggérer des
 * produits du catalogue correspondants (voir produitsSuggeresPourBesoins).
 */
export const VISIONS_BESOIN = ["LOIN", "PRES", "PROGRESSIF"] as const;
export type VisionBesoin = (typeof VISIONS_BESOIN)[number];

export const TRAITEMENTS_VERRE_BESOIN = ["ANTIREFLET", "ANTI_LUMIERE_BLEUE", "PHOTOCHROMIQUE", "DEGRADE", "POLARISANT"] as const;
export type TraitementVerreBesoin = (typeof TRAITEMENTS_VERRE_BESOIN)[number];

export const MATIERES_MONTURE_BESOIN = ["METAL", "PLASTIQUE", "NYLOR", "PERCEE"] as const;
export type MatiereMontureBesoin = (typeof MATIERES_MONTURE_BESOIN)[number];

export const STYLES_BESOIN = [
  "DE_MARQUE",
  "SIMPLE",
  "LEGERE",
  "DISCRETE",
  "EXTRAVAGANT",
  "COLOREE",
  "NOIRE",
  "ECAILLE",
  "AVEC_DU_PEPS",
  "SOBRE",
] as const;
export type StyleBesoin = (typeof STYLES_BESOIN)[number];

export const LIBELLES_VISION_BESOIN: Record<VisionBesoin, string> = {
  LOIN: "Vision de loin",
  PRES: "Vision de près",
  PROGRESSIF: "Progressif",
};

export const LIBELLES_TRAITEMENT_VERRE_BESOIN: Record<TraitementVerreBesoin, string> = {
  ANTIREFLET: "Antireflet",
  ANTI_LUMIERE_BLEUE: "Anti-lumière bleue",
  PHOTOCHROMIQUE: "Photochromique (se teinte au soleil)",
  DEGRADE: "Dégradé",
  POLARISANT: "Polarisant",
};

export const LIBELLES_MATIERE_MONTURE_BESOIN: Record<MatiereMontureBesoin, string> = {
  METAL: "Métal",
  PLASTIQUE: "Plastique",
  NYLOR: "Nylor",
  PERCEE: "Percée",
};

export const LIBELLES_STYLE_BESOIN: Record<StyleBesoin, string> = {
  DE_MARQUE: "De marque",
  SIMPLE: "Simple",
  LEGERE: "Légère",
  DISCRETE: "Discrète",
  EXTRAVAGANT: "Extravagant",
  COLOREE: "Colorée",
  NOIRE: "Noire",
  ECAILLE: "Écaille",
  AVEC_DU_PEPS: "Avec du peps",
  SOBRE: "Assez sobre",
};

export function estVisionBesoin(v: string): v is VisionBesoin {
  return (VISIONS_BESOIN as readonly string[]).includes(v);
}
export function estTraitementVerreBesoin(v: string): v is TraitementVerreBesoin {
  return (TRAITEMENTS_VERRE_BESOIN as readonly string[]).includes(v);
}
export function estMatiereMontureBesoin(v: string): v is MatiereMontureBesoin {
  return (MATIERES_MONTURE_BESOIN as readonly string[]).includes(v);
}
export function estStyleBesoin(v: string): v is StyleBesoin {
  return (STYLES_BESOIN as readonly string[]).includes(v);
}

export type BesoinsExprimes = {
  vision: VisionBesoin | null;
  traitementsVerre: TraitementVerreBesoin[];
  matiereMonture: MatiereMontureBesoin | null;
  style: StyleBesoin[];
};

/**
 * Mots-clés recherchés dans le catalogue (categorie/description/remarque/
 * modele — champs libres, voir model Produit) pour chaque valeur de la
 * taxonomie. Recherche textuelle "au mieux" : le catalogue n'a pas de
 * champs dédiés pour ces critères, contrairement à la taxonomie elle-même
 * — DE_MARQUE n'a volontairement pas de mot-clé (une marque ne se déduit
 * pas d'un mot dans le texte).
 */
const MOTS_CLES_TRAITEMENT_VERRE: Record<TraitementVerreBesoin, string[]> = {
  ANTIREFLET: ["antireflet", "anti-reflet"],
  ANTI_LUMIERE_BLEUE: ["lumière bleue", "lumiere bleue", "blue light", "anti-lumière"],
  PHOTOCHROMIQUE: ["photochromique", "transitions"],
  DEGRADE: ["dégradé", "degrade"],
  POLARISANT: ["polarisant", "polarisé", "polarise"],
};

const MOTS_CLES_MATIERE_MONTURE: Record<MatiereMontureBesoin, string[]> = {
  METAL: ["métal", "metal"],
  PLASTIQUE: ["plastique", "acétate", "acetate"],
  NYLOR: ["nylor"],
  PERCEE: ["percée", "percee"],
};

const MOTS_CLES_STYLE: Record<StyleBesoin, string[]> = {
  DE_MARQUE: [],
  SIMPLE: ["simple", "épuré", "epure"],
  LEGERE: ["légère", "legere", "léger", "leger"],
  DISCRETE: ["discret", "discrète", "discrete"],
  EXTRAVAGANT: ["extravagant", "original"],
  COLOREE: ["coloré", "colore", "couleur"],
  NOIRE: ["noir"],
  ECAILLE: ["écaille", "ecaille"],
  AVEC_DU_PEPS: ["peps", "fun"],
  SOBRE: ["sobre", "classique"],
};

const CHAMPS_TEXTE_PRODUIT = ["categorie", "description", "remarque", "modele"] as const;

function conditionsMotsCles(mots: string[]): Prisma.ProduitWhereInput[] {
  return mots.flatMap((mot) => CHAMPS_TEXTE_PRODUIT.map((champ) => ({ [champ]: { contains: mot, mode: "insensitive" as const } })));
}

/**
 * Suggère des produits du catalogue correspondant aux besoins exprimés —
 * recherche textuelle "au mieux" (voir commentaire ci-dessus), jamais un
 * filtre garanti exhaustif : le catalogue existant n'est pas tagué pour ces
 * critères. Verres et montures cherchés séparément (activité optique
 * uniquement — cette taxonomie ne couvre pas l'audition).
 */
export async function produitsSuggeresPourBesoins(besoins: BesoinsExprimes) {
  const motsVerre = besoins.traitementsVerre.flatMap((t) => MOTS_CLES_TRAITEMENT_VERRE[t]);
  const motsMonture = [
    ...(besoins.matiereMonture ? MOTS_CLES_MATIERE_MONTURE[besoins.matiereMonture] : []),
    ...besoins.style.flatMap((s) => MOTS_CLES_STYLE[s]),
  ];

  const [verres, montures] = await Promise.all([
    motsVerre.length === 0
      ? []
      : prisma.produit.findMany({
          where: { type: "VERRE", activite: "OPTIQUE", statut: "ACTIF", OR: conditionsMotsCles(motsVerre) },
          orderBy: [{ marque: "asc" }, { modele: "asc" }],
          take: 10,
        }),
    motsMonture.length === 0
      ? []
      : prisma.produit.findMany({
          where: { type: "MONTURE", activite: "OPTIQUE", statut: "ACTIF", OR: conditionsMotsCles(motsMonture) },
          orderBy: [{ marque: "asc" }, { modele: "asc" }],
          take: 10,
        }),
  ]);

  return { verres, montures };
}
