import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Génère un devis imprimable — pour un client qui préfère signer sur
 * papier plutôt qu'au stylet ou par code SMS (voir carte Propositions).
 * Une fois signé, à scanner et téléverser comme pièce DEVIS_SIGNE, puis
 * rattacher à la proposition (POST .../accepter-signature, mode PAPIER).
 */
export async function genererDevisPdf(params: {
  prenom: string;
  nom: string;
  creeA: Date;
  lignes: { libelle: string; quantite: number; prixUnitaireTTC: number }[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const policeGras = await doc.embedFont(StandardFonts.HelveticaBold);

  const marge = 50;
  let y = 800;
  const largeur = page.getWidth() - marge * 2;

  function formaterPrix(centimes: number): string {
    return `${(centimes / 100).toFixed(2)} €`;
  }

  page.drawText("Devis", { x: marge, y, size: 18, font: policeGras });
  y -= 26;
  page.drawText(`Client : ${params.prenom} ${params.nom}`, { x: marge, y, size: 11, font: police });
  y -= 16;
  page.drawText(`Établi le ${params.creeA.toLocaleDateString("fr-FR")}`, { x: marge, y, size: 10, font: police, color: rgb(0.4, 0.4, 0.4) });
  y -= 30;

  page.drawLine({ start: { x: marge, y }, end: { x: marge + largeur, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;

  page.drawText("Désignation", { x: marge, y, size: 10, font: policeGras });
  page.drawText("Qté", { x: marge + largeur - 160, y, size: 10, font: policeGras });
  page.drawText("Prix unitaire", { x: marge + largeur - 120, y, size: 10, font: policeGras });
  page.drawText("Total", { x: marge + largeur - 40, y, size: 10, font: policeGras });
  y -= 18;

  let total = 0;
  for (const ligne of params.lignes) {
    const totalLigne = ligne.prixUnitaireTTC * ligne.quantite;
    total += totalLigne;
    page.drawText(ligne.libelle.slice(0, 55), { x: marge, y, size: 10, font: police });
    page.drawText(String(ligne.quantite), { x: marge + largeur - 160, y, size: 10, font: police });
    page.drawText(formaterPrix(ligne.prixUnitaireTTC), { x: marge + largeur - 120, y, size: 10, font: police });
    page.drawText(formaterPrix(totalLigne), { x: marge + largeur - 40, y, size: 10, font: police });
    y -= 18;
  }

  y -= 8;
  page.drawLine({ start: { x: marge, y }, end: { x: marge + largeur, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;
  page.drawText("Total TTC", { x: marge + largeur - 160, y, size: 12, font: policeGras });
  page.drawText(formaterPrix(total), { x: marge + largeur - 40, y, size: 12, font: policeGras });

  y -= 60;
  page.drawText("Bon pour accord — signature du client :", { x: marge, y, size: 10, font: police });
  page.drawRectangle({ x: marge, y: y - 90, width: largeur, height: 90, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });

  page.drawText(
    "Une fois signé, ce document doit être scanné et téléversé dans le dossier (pièce \"Devis signé\") pour valider l'acceptation.",
    { x: marge, y: 40, size: 8, font: police, color: rgb(0.4, 0.4, 0.4) },
  );

  return doc.save();
}
