import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ModeleDocument } from "@prisma/client";
import { dessinerEntete, dessinerPiedDePage } from "@/lib/pdfCommun";

/**
 * Génère un document récapitulatif de l'accord (ou du refus) de prise en
 * charge d'une mutuelle — trace écrite à conserver au dossier, en plus du
 * statut suivi dans l'application (carte Mutuelle & tiers payant).
 */
export async function genererAccordTiersPayantPdf(params: {
  prenom: string;
  nom: string;
  statut: "ACCORD" | "REFUS";
  reponseA: Date | null;
  montantPriseEnChargeTTC: number | null;
  motifRefus: string | null;
  mutuelleNom: string | null;
  finess: string | null;
  rpps: string | null;
  // Contrairement au devis/à la facture, ce document interne à l'échange
  // avec la mutuelle/sécurité sociale liste aussi le fournisseur de chaque
  // article, nécessaire au traitement de la demande — voir
  // PropositionLigne.fournisseurNom (jamais imprimé sur devis/facture).
  lignes?: { libelle: string; description?: string | null; fournisseur?: string | null }[];
  modele?: ModeleDocument | null;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const policeGras = await doc.embedFont(StandardFonts.HelveticaBold);

  const marge = 50;

  function formaterPrix(centimes: number): string {
    return `${(centimes / 100).toFixed(2)} €`;
  }

  const titre = params.statut === "ACCORD" ? "Accord de prise en charge — tiers payant" : "Refus de prise en charge — tiers payant";
  let y = dessinerEntete(page, police, policeGras, marge, 800, titre, params.modele ?? null);

  page.drawText(`Assuré(e) : ${params.prenom} ${params.nom}`, { x: marge, y, size: 11, font: police });
  y -= 18;
  if (params.mutuelleNom) {
    page.drawText(`Mutuelle : ${params.mutuelleNom}`, { x: marge, y, size: 10, font: police });
    y -= 16;
  }
  if (params.finess) {
    page.drawText(`FINESS du prescripteur : ${params.finess}${params.rpps ? ` · RPPS ${params.rpps}` : ""}`, {
      x: marge,
      y,
      size: 10,
      font: police,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 16;
  }
  y -= 10;

  if (params.reponseA) {
    page.drawText(`Réponse reçue le ${params.reponseA.toLocaleDateString("fr-FR")}`, { x: marge, y, size: 10, font: police });
    y -= 20;
  }

  if (params.statut === "ACCORD") {
    page.drawText("Montant pris en charge par la mutuelle", { x: marge, y, size: 11, font: policeGras });
    y -= 18;
    page.drawText(formaterPrix(params.montantPriseEnChargeTTC ?? 0), { x: marge, y, size: 14, font: policeGras, color: rgb(0.06, 0.5, 0.35) });
  } else {
    page.drawText("Motif du refus", { x: marge, y, size: 11, font: policeGras });
    y -= 18;
    page.drawText(params.motifRefus ?? "Non précisé.", { x: marge, y, size: 10, font: police });
  }

  if (params.lignes && params.lignes.length > 0) {
    y -= 30;
    page.drawText("Articles concernés", { x: marge, y, size: 11, font: policeGras });
    y -= 6;
    for (const ligne of params.lignes) {
      y -= 16;
      page.drawText(ligne.libelle.slice(0, 70), { x: marge, y, size: 10, font: police });
      if (ligne.description) {
        y -= 13;
        page.drawText(ligne.description.slice(0, 90), { x: marge, y, size: 8, font: police, color: rgb(0.45, 0.45, 0.45) });
      }
      if (ligne.fournisseur) {
        y -= 13;
        page.drawText(`Fournisseur : ${ligne.fournisseur}`, { x: marge, y, size: 8, font: police, color: rgb(0.45, 0.45, 0.45) });
      }
    }
  }

  dessinerPiedDePage(page, police, marge, params.modele ?? null);

  return doc.save();
}
