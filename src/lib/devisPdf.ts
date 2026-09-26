import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ModeleDocument } from "@prisma/client";
import { dessinerEntete, dessinerPiedDePage } from "@/lib/pdfCommun";

/**
 * Génère un devis imprimable — pour un client qui préfère signer sur
 * papier plutôt qu'au stylet ou par code SMS (voir carte Propositions).
 * Une fois signé, à scanner et téléverser comme pièce DEVIS_SIGNE, puis
 * rattacher à la proposition (POST .../accepter-signature, mode PAPIER).
 *
 * `normalise: true` ajoute la structure à deux offres (100% Santé / marché
 * libre) attendue par la réglementation optique (arrêté du 3 décembre
 * 2018). **Important** : ceci reproduit la structure générale connue par
 * recherche documentaire, pas un modèle certifié conforme — voir
 * docs/dossier-cadrage.md, qui indique explicitement qu'une génération de
 * devis normalisé réellement conforme nécessite une revue par un expert
 * métier/juridique avant tout usage réel avec des clients.
 */
export async function genererDevisPdf(params: {
  prenom: string;
  nom: string;
  creeA: Date;
  lignes: { libelle: string; description?: string | null; quantite: number; prixUnitaireTTC: number }[];
  normalise?: boolean;
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

  let y = dessinerEntete(page, police, policeGras, marge, 800, params.normalise ? "Devis normalisé" : "Devis", params.modele ?? null);

  page.drawText(`Client : ${params.prenom} ${params.nom}`, { x: marge, y, size: 11, font: police });
  y -= 16;
  page.drawText(`Établi le ${params.creeA.toLocaleDateString("fr-FR")}`, { x: marge, y, size: 10, font: police, color: rgb(0.4, 0.4, 0.4) });
  y -= 24;

  if (params.normalise) {
    page.drawText(
      "⚠️ Modèle indicatif — à faire valider par un expert métier/juridique avant tout usage réel (voir README).",
      { x: marge, y, size: 8, font: police, color: rgb(0.7, 0.4, 0) },
    );
    y -= 18;
    page.drawText("Offre 100% Santé (reste à charge nul)", { x: marge, y, size: 11, font: policeGras });
    y -= 4;
  }

  y -= 16;
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
    y -= 14;
    if (ligne.description) {
      page.drawText(ligne.description.slice(0, 90), { x: marge, y, size: 8, font: police, color: rgb(0.45, 0.45, 0.45) });
      y -= 14;
    }
    y -= 4;
  }

  y -= 8;
  page.drawLine({ start: { x: marge, y }, end: { x: marge + largeur, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;
  page.drawText("Total TTC", { x: marge + largeur - 160, y, size: 12, font: policeGras });
  page.drawText(formaterPrix(total), { x: marge + largeur - 40, y, size: 12, font: policeGras });

  if (params.normalise) {
    y -= 30;
    page.drawText("Offre marché libre — équivalent hors 100% Santé, si applicable (à compléter manuellement).", {
      x: marge,
      y,
      size: 9,
      font: police,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  y -= 50;
  page.drawText("Bon pour accord — signature du client :", { x: marge, y, size: 10, font: police });
  const hauteurSignature = 80;
  page.drawRectangle({ x: marge, y: y - hauteurSignature, width: largeur, height: hauteurSignature, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });

  dessinerPiedDePage(
    page,
    police,
    marge,
    params.modele ?? {
      piedDePage: "Une fois signé, ce document doit être scanné et téléversé dans le dossier (pièce \"Devis signé\") pour valider l'acceptation.",
    },
  );

  return doc.save();
}
