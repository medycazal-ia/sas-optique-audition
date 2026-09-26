import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ModeleDocument } from "@prisma/client";
import { dessinerEntete, dessinerPiedDePage } from "@/lib/pdfCommun";

/** Génère une facture imprimable (carte Facturation & financement) — voir carte Super Admin pour configurer l'en-tête/pied de page. */
export async function genererFacturePdf(params: {
  prenom: string;
  nom: string;
  creeA: Date;
  montantTTC: number;
  lignes: { libelle: string; quantite: number; prixUnitaireTTC: number | null }[];
  modele?: ModeleDocument | null;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const policeGras = await doc.embedFont(StandardFonts.HelveticaBold);

  const marge = 50;
  const largeur = page.getWidth() - marge * 2;

  function formaterPrix(centimes: number): string {
    return `${(centimes / 100).toFixed(2)} €`;
  }

  let y = dessinerEntete(page, police, policeGras, marge, 800, "Facture", params.modele ?? null);

  page.drawText(`Client : ${params.prenom} ${params.nom}`, { x: marge, y, size: 11, font: police });
  y -= 16;
  page.drawText(`Émise le ${params.creeA.toLocaleDateString("fr-FR")}`, { x: marge, y, size: 10, font: police, color: rgb(0.4, 0.4, 0.4) });
  y -= 30;

  page.drawLine({ start: { x: marge, y }, end: { x: marge + largeur, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;

  page.drawText("Désignation", { x: marge, y, size: 10, font: policeGras });
  page.drawText("Qté", { x: marge + largeur - 160, y, size: 10, font: policeGras });
  page.drawText("Prix unitaire", { x: marge + largeur - 120, y, size: 10, font: policeGras });
  page.drawText("Total", { x: marge + largeur - 40, y, size: 10, font: policeGras });
  y -= 18;

  for (const ligne of params.lignes) {
    const prixUnitaire = ligne.prixUnitaireTTC ?? 0;
    const totalLigne = prixUnitaire * ligne.quantite;
    page.drawText(ligne.libelle.slice(0, 55), { x: marge, y, size: 10, font: police });
    page.drawText(String(ligne.quantite), { x: marge + largeur - 160, y, size: 10, font: police });
    page.drawText(formaterPrix(prixUnitaire), { x: marge + largeur - 120, y, size: 10, font: police });
    page.drawText(formaterPrix(totalLigne), { x: marge + largeur - 40, y, size: 10, font: police });
    y -= 18;
  }

  y -= 8;
  page.drawLine({ start: { x: marge, y }, end: { x: marge + largeur, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;
  page.drawText("Total TTC dû", { x: marge + largeur - 160, y, size: 12, font: policeGras });
  page.drawText(formaterPrix(params.montantTTC), { x: marge + largeur - 40, y, size: 12, font: policeGras });

  dessinerPiedDePage(page, police, marge, params.modele ?? null);

  return doc.save();
}
