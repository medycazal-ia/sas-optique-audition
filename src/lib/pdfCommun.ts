import type { PDFFont, PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";
import type { ModeleDocument } from "@prisma/client";

type Entete = Pick<ModeleDocument, "enteteNom" | "enteteAdresse" | "enteteSiret" | "enteteTelephone" | "enteteEmail" | "texteIntro"> | null;
type PiedDePage = Pick<ModeleDocument, "piedDePage"> | null;

/** Découpe un texte en lignes qui tiennent dans `largeurMax`, pour un dessin ligne par ligne. */
export function decouperTexte(police: PDFFont, texte: string, taille: number, largeurMax: number): string[] {
  const lignes: string[] = [];
  for (const paragraphe of texte.split("\n")) {
    const mots = paragraphe.split(" ");
    let ligne = "";
    for (const mot of mots) {
      const essai = ligne ? `${ligne} ${mot}` : mot;
      if (police.widthOfTextAtSize(essai, taille) > largeurMax && ligne) {
        lignes.push(ligne);
        ligne = mot;
      } else {
        ligne = essai;
      }
    }
    lignes.push(ligne);
  }
  return lignes;
}

/**
 * Dessine l'en-tête configurable d'un modèle de document (nom, adresse,
 * SIRET, téléphone, email — voir carte Super Admin "Modèles de documents")
 * puis le titre du document. Retombe sur le seul titre si aucun modèle
 * n'est configuré/actif pour ce type — jamais un en-tête vide qui ferait
 * planter la génération.
 */
export function dessinerEntete(
  page: PDFPage,
  police: PDFFont,
  policeGras: PDFFont,
  marge: number,
  yDepart: number,
  titre: string,
  modele: Entete,
): number {
  let y = yDepart;
  if (modele?.enteteNom) {
    page.drawText(modele.enteteNom, { x: marge, y, size: 14, font: policeGras });
    y -= 18;
    const coordonnees = [modele.enteteAdresse, modele.enteteSiret ? `SIRET ${modele.enteteSiret}` : null, modele.enteteTelephone, modele.enteteEmail]
      .filter((v): v is string => Boolean(v))
      .join(" · ");
    if (coordonnees) {
      page.drawText(coordonnees, { x: marge, y, size: 9, font: police, color: rgb(0.4, 0.4, 0.4) });
      y -= 20;
    } else {
      y -= 6;
    }
  }
  page.drawText(titre, { x: marge, y, size: 18, font: policeGras });
  y -= 26;
  if (modele?.texteIntro) {
    for (const ligne of decouperTexte(police, modele.texteIntro, 9, page.getWidth() - marge * 2)) {
      page.drawText(ligne, { x: marge, y, size: 9, font: police, color: rgb(0.3, 0.3, 0.3) });
      y -= 13;
    }
    y -= 8;
  }
  return y;
}

/** Dessine le pied de page configurable (mentions légales, CGV...) tout en bas du document. */
export function dessinerPiedDePage(page: PDFPage, police: PDFFont, marge: number, modele: PiedDePage): void {
  if (!modele?.piedDePage) return;
  const lignes = decouperTexte(police, modele.piedDePage, 8, page.getWidth() - marge * 2);
  let y = 20 + (lignes.length - 1) * 11;
  for (const ligne of lignes) {
    page.drawText(ligne, { x: marge, y, size: 8, font: police, color: rgb(0.5, 0.5, 0.5) });
    y -= 11;
  }
}
