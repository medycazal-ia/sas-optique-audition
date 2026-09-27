import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { dessinerEntete, dessinerPiedDePage, decouperTexte } from "@/lib/pdfCommun";

/**
 * PDF de la synthèse besoin validée (carte Audit) — intégré au dossier
 * comme document (type SYNTHESE_BESOIN), voir POST .../synthese/valider.
 * Sert de point de départ à la proposition commerciale (voir "Aller à la
 * proposition" dans DossierDetailClient.tsx).
 */
export async function genererAuditPdf(params: {
  prenom: string;
  nom: string;
  date: Date;
  syntheseBesoin: string;
  chips: string[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const policeGras = await doc.embedFont(StandardFonts.HelveticaBold);

  const marge = 50;
  const largeur = page.getWidth() - marge * 2;

  let y = dessinerEntete(page, police, policeGras, marge, 800, "Synthèse du besoin", null);

  page.drawText(`Client : ${params.prenom} ${params.nom}`, { x: marge, y, size: 11, font: police });
  y -= 16;
  page.drawText(`Établi le ${params.date.toLocaleDateString("fr-FR")}`, { x: marge, y, size: 10, font: police, color: rgb(0.4, 0.4, 0.4) });
  y -= 24;

  if (params.chips.length > 0) {
    page.drawText("Besoins exprimés", { x: marge, y, size: 11, font: policeGras });
    y -= 16;
    for (const ligne of decouperTexte(police, params.chips.join("  •  "), 10, largeur)) {
      page.drawText(ligne, { x: marge, y, size: 10, font: police });
      y -= 14;
    }
    y -= 10;
  }

  page.drawText("Synthèse", { x: marge, y, size: 11, font: policeGras });
  y -= 16;
  const texteSynthese = params.syntheseBesoin.trim() || "(aucune synthèse renseignée)";
  for (const ligne of decouperTexte(police, texteSynthese, 10, largeur)) {
    page.drawText(ligne, { x: marge, y, size: 10, font: police });
    y -= 14;
  }

  dessinerPiedDePage(page, police, marge, {
    piedDePage: "Généré par IA à partir d'une conversation avec le client, relu et validé par l'équipe avant tout usage commercial.",
  });

  return doc.save();
}
