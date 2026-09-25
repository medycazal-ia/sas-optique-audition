import { randomUUID } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

const DOSSIER_BASE = process.env.STOCKAGE_LOCAL_DOSSIER ?? "./stockage-local/documents";

export type FichierEnregistre = {
  /** Référence portable stockée en base (Document.cheminStockage) — jamais un chemin absolu. */
  cheminStockage: string;
};

/**
 * Adaptateur de stockage local (dev/démo uniquement — voir
 * docs/conformite-hds.md). En production, remplacer ces deux fonctions par
 * un client S3-compatible chez l'hébergeur HDS retenu, en conservant la même
 * signature : cheminStockage reste une référence opaque, aucun autre code du
 * projet n'a besoin de changer.
 */
export async function enregistrerFichier(
  personneId: string,
  nomFichierOriginal: string,
  contenu: Buffer,
): Promise<FichierEnregistre> {
  const nomSecurise = nomFichierOriginal.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const cheminRelatif = path.join(personneId, `${randomUUID()}-${nomSecurise}`);
  const cheminAbsolu = path.join(DOSSIER_BASE, cheminRelatif);

  await mkdir(path.dirname(cheminAbsolu), { recursive: true });
  await writeFile(cheminAbsolu, contenu);

  return { cheminStockage: cheminRelatif };
}

/**
 * Supprime tous les fichiers d'une personne (un dossier par personne, voir
 * enregistrerFichier) — réservé à la réinitialisation des données démo.
 */
export async function supprimerFichiersPersonne(personneId: string): Promise<void> {
  const cheminAbsolu = path.join(DOSSIER_BASE, personneId);
  await rm(cheminAbsolu, { recursive: true, force: true });
}

/**
 * Supprime un seul fichier déjà enregistré — utilisé quand une pièce de la
 * carte Santé est remise à "non fournie" après avoir été scannée. Même
 * garde anti-traversée de répertoire que lireFichier ; `force: true`
 * absorbe un fichier déjà absent (ex. une pièce "vérifiée sans scan", qui
 * n'a jamais eu de fichier réel) sans faire échouer l'appelant.
 */
export async function supprimerFichier(cheminStockage: string): Promise<void> {
  const cheminNormalise = path.normalize(cheminStockage);
  if (cheminNormalise.startsWith("..") || path.isAbsolute(cheminNormalise)) {
    throw new Error("Chemin de stockage invalide.");
  }
  const cheminAbsolu = path.join(/* turbopackIgnore: true */ DOSSIER_BASE, cheminNormalise);
  await rm(/* turbopackIgnore: true */ cheminAbsolu, { force: true });
}

export async function lireFichier(cheminStockage: string): Promise<Buffer> {
  // cheminStockage est une donnée qui a transité par la base : on ne lui
  // fait jamais confiance aveuglément avant de bâtir un chemin de fichier
  // (protection contre une traversée de répertoire via "../").
  const cheminNormalise = path.normalize(cheminStockage);
  if (cheminNormalise.startsWith("..") || path.isAbsolute(cheminNormalise)) {
    throw new Error("Chemin de stockage invalide.");
  }
  // turbopackIgnore : chemin dynamique par nature (dossier de stockage
  // configurable) — cet adaptateur local est de toute façon remplacé par un
  // client S3 avant la mise en production, voir docs/conformite-hds.md.
  const cheminAbsolu = path.join(/* turbopackIgnore: true */ DOSSIER_BASE, cheminNormalise);
  try {
    return await readFile(/* turbopackIgnore: true */ cheminAbsolu);
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "ENOENT") {
      // Sans disque persistant (voir render.yaml > disk), le fichier peut
      // avoir disparu lors d'un redéploiement alors que sa ligne Document
      // reste en base (PostgreSQL, lui, persistant) — message clair plutôt
      // que le chemin technique brut, à l'utilisateur comme à l'appelant.
      throw new Error(
        "Fichier introuvable sur le serveur — probablement perdu lors d'un redéploiement (stockage non persistant). Re-téléversez cette pièce.",
      );
    }
    throw e;
  }
}
