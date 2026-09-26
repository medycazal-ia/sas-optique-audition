import type { TypeOrdonnance, TypeProduit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculerDescriptionProduit } from "@/lib/descriptionProduit";

/**
 * Modèle d'import/export CSV en masse des produits — colonnes demandées :
 * "activite, reference, qrcode, categorie, nom (modèle), taille, coloris,
 * nomenclature, quantite, date dernière sortie, prix achat, coefficient,
 * prix public TTC, taux tva, prix vente HT, plafond remise, remarque".
 * `type` et `marque` sont ajoutées en tête (nécessaires à toute création de
 * produit, déjà obligatoires avant cette demande) — toutes les autres
 * colonnes sont optionnelles à l'import, comme demandé, mais présentes ici
 * pour que la création manuelle et l'import CSV partagent exactement les
 * mêmes rubriques (voir /produits/nouveau).
 *
 * Une ligne dont la référence existe déjà met à jour le produit existant
 * (upsert) — permet de réimporter un fichier corrigé sans créer de doublons.
 */
export const TYPES_PRODUIT_CSV: TypeProduit[] = [
  "MONTURE",
  "VERRE",
  "LENTILLE",
  "ACCESSOIRE",
  "APPAREIL_AUDITIF",
  "ECOUTEUR",
  "PILE_AUDITIVE",
  "ACCESSOIRE_AUDITIF",
];
const ACTIVITES_CSV: TypeOrdonnance[] = ["OPTIQUE", "AUDITION"];

export const COLONNES_CSV = [
  "type",
  "activite",
  "reference",
  "qrcode",
  "categorie",
  "marque",
  "nom",
  "taille",
  "coloris",
  "nomenclature",
  "quantite",
  "date_derniere_sortie",
  "prix_achat",
  "coefficient",
  "prix_public_ttc",
  "taux_tva",
  "prix_vente_ht",
  "plafond_remise",
  "remarque",
] as const;

export function genererGabaritCsv(): string {
  const exemple = [
    "MONTURE",
    "OPTIQUE",
    "MTR-0001",
    "",
    "Solaire",
    "Ray-Ban",
    "Aviator",
    "58",
    "Noir",
    "",
    "10",
    "",
    "45.00",
    "2.5",
    "129.90",
    "20",
    "108.25",
    "10",
    "",
  ];
  return [COLONNES_CSV.join(","), exemple.map(echapperChampCsv).join(",")].join("\n") + "\n";
}

export async function genererExportCsv(): Promise<string> {
  const produits = await prisma.produit.findMany({
    include: { fournisseur: true, stocks: true },
    orderBy: [{ marque: "asc" }, { modele: "asc" }],
  });

  const lignes = produits.map((p) => {
    const quantiteTotale = p.stocks.reduce((somme, s) => somme + s.quantite, 0);
    return [
      p.type,
      p.activite,
      p.reference,
      p.qrcode ?? "",
      p.categorie ?? "",
      p.marque,
      p.modele,
      p.taille ?? "",
      p.coloris ?? "",
      p.nomenclature ?? "",
      String(quantiteTotale),
      p.dateDerniereSortie ? p.dateDerniereSortie.toISOString().slice(0, 10) : "",
      p.prixAchat != null ? (p.prixAchat / 100).toFixed(2) : "",
      p.coefficient != null ? String(p.coefficient) : "",
      (p.prixTTC / 100).toFixed(2),
      p.tauxTva != null ? String(p.tauxTva * 100) : "",
      p.prixVenteHT != null ? (p.prixVenteHT / 100).toFixed(2) : "",
      p.plafondRemise != null ? String(p.plafondRemise * 100) : "",
      p.remarque ?? "",
    ].map(echapperChampCsv).join(",");
  });

  return [COLONNES_CSV.join(","), ...lignes].join("\n") + "\n";
}

function echapperChampCsv(valeur: string): string {
  if (/[",\n]/.test(valeur)) {
    return `"${valeur.replace(/"/g, '""')}"`;
  }
  return valeur;
}

/** Parseur CSV minimal mais conforme RFC 4180 (guillemets, virgules et retours à la ligne dans un champ). */
export function parserCsv(texte: string): string[][] {
  const lignes: string[][] = [];
  let champ = "";
  let ligne: string[] = [];
  let dansGuillemets = false;

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (dansGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') {
          champ += '"';
          i++;
        } else {
          dansGuillemets = false;
        }
      } else {
        champ += c;
      }
    } else if (c === '"') {
      dansGuillemets = true;
    } else if (c === ",") {
      ligne.push(champ);
      champ = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      ligne.push(champ);
      lignes.push(ligne);
      champ = "";
      ligne = [];
    } else {
      champ += c;
    }
  }
  if (champ !== "" || ligne.length > 0) {
    ligne.push(champ);
    lignes.push(ligne);
  }
  return lignes.filter((l) => l.some((c) => c.trim() !== ""));
}

function texteOptionnel(v: string | undefined): string | null {
  return v && v.trim() ? v.trim() : null;
}
function nombreOptionnel(v: string | undefined): number | null {
  if (!v || !v.trim()) return null;
  const n = Number(v.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function euroVersCentimesOptionnel(v: string | undefined): number | null {
  const n = nombreOptionnel(v);
  return n === null ? null : Math.round(n * 100);
}

export type ResultatImportLigne = { ligne: number; reference: string; statut: "creee" | "mise_a_jour"; erreur?: string };

/**
 * Importe le CSV en masse : upsert par référence (une référence déjà connue
 * met à jour le produit existant plutôt que de créer un doublon). magasinId
 * optionnel : si fourni, la colonne quantite met aussi à jour le stock de ce
 * magasin pour chaque ligne (un import CSV vise un seul magasin à la fois).
 */
export async function importerProduitsCsv(
  texteCsv: string,
  magasinId: string | null,
  modifiePar?: string,
): Promise<{ resultats: ResultatImportLigne[]; erreurs: ResultatImportLigne[] }> {
  const lignesBrutes = parserCsv(texteCsv);
  if (lignesBrutes.length === 0) {
    return { resultats: [], erreurs: [] };
  }
  const entetes = lignesBrutes[0].map((h) => h.trim().toLowerCase());
  const resultats: ResultatImportLigne[] = [];
  const erreurs: ResultatImportLigne[] = [];

  for (let i = 1; i < lignesBrutes.length; i++) {
    const numeroLigne = i + 1; // +1 pour compenser l'en-tête (ligne 1 du fichier)
    const valeurs = lignesBrutes[i];
    const get = (cle: string): string | undefined => {
      const index = entetes.indexOf(cle);
      return index === -1 ? undefined : valeurs[index];
    };

    const reference = (get("reference") ?? "").trim();
    if (!reference) {
      erreurs.push({ ligne: numeroLigne, reference: "", statut: "creee", erreur: "reference manquante — ligne ignorée." });
      continue;
    }

    const type = (get("type") ?? "").trim().toUpperCase();
    const activiteBrute = (get("activite") ?? "").trim().toUpperCase();
    const marque = (get("marque") ?? "").trim();
    const nom = (get("nom") ?? get("modele") ?? "").trim();

    try {
      const existant = await prisma.produit.findUnique({ where: { reference } });

      if (!existant && (!TYPES_PRODUIT_CSV.includes(type as TypeProduit) || !marque || !nom)) {
        erreurs.push({
          ligne: numeroLigne,
          reference,
          statut: "creee",
          erreur: "type, marque et nom sont requis pour créer un nouveau produit.",
        });
        continue;
      }

      const prixTTC = euroVersCentimesOptionnel(get("prix_public_ttc"));
      if (!existant && prixTTC === null) {
        erreurs.push({ ligne: numeroLigne, reference, statut: "creee", erreur: "prix_public_ttc requis pour créer un nouveau produit." });
        continue;
      }

      const taille = texteOptionnel(get("taille"));
      const coloris = texteOptionnel(get("coloris"));
      const nomenclature = texteOptionnel(get("nomenclature"));
      const tauxTvaPct = nombreOptionnel(get("taux_tva"));
      const tauxTva = tauxTvaPct === null ? null : tauxTvaPct / 100;
      const prixVenteHT = euroVersCentimesOptionnel(get("prix_vente_ht"));
      const plafondRemisePct = nombreOptionnel(get("plafond_remise"));
      const plafondRemise = plafondRemisePct === null ? null : plafondRemisePct / 100;
      const prixAchat = euroVersCentimesOptionnel(get("prix_achat"));
      const coefficient = nombreOptionnel(get("coefficient"));
      const dateDerniereSortieBrute = texteOptionnel(get("date_derniere_sortie"));
      const dateDerniereSortie = dateDerniereSortieBrute ? new Date(dateDerniereSortieBrute) : null;
      const qrcode = texteOptionnel(get("qrcode"));
      const categorie = texteOptionnel(get("categorie"));
      const remarque = texteOptionnel(get("remarque"));
      const activite = ACTIVITES_CSV.includes(activiteBrute as TypeOrdonnance) ? (activiteBrute as TypeOrdonnance) : undefined;

      const prixTTCFinal = prixTTC ?? existant?.prixTTC ?? 0;
      const description = calculerDescriptionProduit({
        modele: nom || existant?.modele || "",
        taille: taille ?? existant?.taille ?? null,
        coloris: coloris ?? existant?.coloris ?? null,
        nomenclature: nomenclature ?? existant?.nomenclature ?? null,
        prixTTC: prixTTCFinal,
        tauxTva: tauxTva ?? existant?.tauxTva ?? null,
        prixVenteHT: prixVenteHT ?? existant?.prixVenteHT ?? null,
      });

      const donneesCommunes = {
        ...(qrcode !== null ? { qrcode } : {}),
        ...(categorie !== null ? { categorie } : {}),
        ...(taille !== null ? { taille } : {}),
        ...(coloris !== null ? { coloris } : {}),
        ...(nomenclature !== null ? { nomenclature } : {}),
        ...(prixAchat !== null ? { prixAchat } : {}),
        ...(coefficient !== null ? { coefficient } : {}),
        ...(tauxTva !== null ? { tauxTva } : {}),
        ...(prixVenteHT !== null ? { prixVenteHT } : {}),
        ...(plafondRemise !== null ? { plafondRemise } : {}),
        ...(remarque !== null ? { remarque } : {}),
        ...(dateDerniereSortie !== null ? { dateDerniereSortie } : {}),
        ...(activite ? { activite } : {}),
        description,
      };

      let produitId: string;
      if (existant) {
        await prisma.produit.update({
          where: { id: existant.id },
          data: {
            ...(marque ? { marque } : {}),
            ...(nom ? { modele: nom } : {}),
            ...(TYPES_PRODUIT_CSV.includes(type as TypeProduit) ? { type: type as TypeProduit } : {}),
            ...(prixTTC !== null ? { prixTTC } : {}),
            ...donneesCommunes,
            ...(prixTTC !== null && prixTTC !== existant.prixTTC
              ? { historiquePrix: { create: { prixTTC, modifiePar } } }
              : {}),
          },
        });
        produitId = existant.id;
        resultats.push({ ligne: numeroLigne, reference, statut: "mise_a_jour" });
      } else {
        const cree = await prisma.produit.create({
          data: {
            type: type as TypeProduit,
            marque,
            modele: nom,
            reference,
            prixTTC: prixTTC!,
            qrcode: qrcode ?? reference,
            ...donneesCommunes,
            historiquePrix: { create: { prixTTC: prixTTC!, modifiePar } },
          },
        });
        produitId = cree.id;
        resultats.push({ ligne: numeroLigne, reference, statut: "creee" });
      }

      const quantite = nombreOptionnel(get("quantite"));
      if (magasinId && quantite !== null && Number.isInteger(quantite) && quantite >= 0) {
        await prisma.stock.upsert({
          where: { produitId_magasinId: { produitId, magasinId } },
          create: { produitId, magasinId, quantite },
          update: { quantite },
        });
      }
    } catch (erreur: unknown) {
      const message = erreur instanceof Error ? erreur.message : "Erreur inconnue.";
      erreurs.push({ ligne: numeroLigne, reference, statut: "creee", erreur: message });
    }
  }

  return { resultats, erreurs };
}
