import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Génère le formulaire papier RGPD pré-rempli — pour un client qui préfère
 * signer sur papier plutôt que valider ses choix à l'écran (voir la pop-up
 * RGPD, carte "RGPD"). Une fois signé, il doit être scanné et téléversé
 * comme document de type CONSENTEMENT_RGPD : à conserver en cas de
 * contrôle ou de litige (c'est la preuve du recueil du consentement).
 *
 * Contenu conforme aux obligations réelles du secteur (voir la pop-up pour
 * le détail et les sources) : information sur le traitement des données de
 * santé (soin, pas de consentement requis pour cet usage précis) + recueil
 * explicite, canal par canal, du consentement à la sollicitation
 * commerciale/de suivi (email, SMS, téléphone) — jamais une seule case
 * globale, un client peut très bien accepter l'email et refuser le reste.
 */
export async function genererFormulaireConsentementRgpd(params: {
  prenom: string;
  nom: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const police = await doc.embedFont(StandardFonts.Helvetica);
  const policeGras = await doc.embedFont(StandardFonts.HelveticaBold);

  const marge = 50;
  let y = 800;
  const largeurTexte = page.getWidth() - marge * 2;

  function titre(texte: string, taille = 14) {
    page.drawText(texte, { x: marge, y, size: taille, font: policeGras, color: rgb(0.1, 0.1, 0.1) });
    y -= taille + 10;
  }

  function paragraphe(texte: string, taille = 10) {
    const mots = texte.split(" ");
    let ligne = "";
    const largeurMax = largeurTexte;
    for (const mot of mots) {
      const essai = ligne ? `${ligne} ${mot}` : mot;
      if (police.widthOfTextAtSize(essai, taille) > largeurMax) {
        page.drawText(ligne, { x: marge, y, size: taille, font: police, color: rgb(0.2, 0.2, 0.2) });
        y -= taille + 4;
        ligne = mot;
      } else {
        ligne = essai;
      }
    }
    if (ligne) {
      page.drawText(ligne, { x: marge, y, size: taille, font: police, color: rgb(0.2, 0.2, 0.2) });
      y -= taille + 4;
    }
    y -= 6;
  }

  function case_a_cocher(libelle: string) {
    page.drawRectangle({
      x: marge,
      y: y - 9,
      width: 12,
      height: 12,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 1,
    });
    page.drawText(libelle, { x: marge + 20, y: y - 8, size: 10, font: police, color: rgb(0.1, 0.1, 0.1) });
    y -= 26;
  }

  titre("Information et consentement — protection des données personnelles (RGPD)", 13);
  paragraphe(
    `Client : ${params.prenom} ${params.nom} — document établi le ${new Date().toLocaleDateString("fr-FR")}.`,
    10,
  );

  y -= 4;
  titre("1. Données de santé (correction visuelle ou auditive)", 11);
  paragraphe(
    "Les mesures de votre correction (ordonnance, audiogramme...) sont traitées dans le cadre de votre prise en " +
      "charge par un professionnel soumis au secret professionnel — leur collecte et leur conservation ne nécessitent " +
      "pas votre consentement (article 9.2.h du RGPD), mais vous en êtes informé(e) ici. Ces données sont conservées " +
      "pendant la durée nécessaire au suivi de votre dossier, puis archivées ou supprimées conformément aux durées " +
      "légales applicables.",
  );

  y -= 4;
  titre("2. Vos droits", 11);
  paragraphe(
    "Vous disposez à tout moment d'un droit d'accès, de rectification, d'effacement, de limitation et de portabilité " +
      "de vos données, ainsi que du droit de vous opposer à leur traitement pour un motif légitime. Pour exercer ces " +
      "droits, adressez-vous directement à l'équipe qui vous a remis ce document.",
  );

  y -= 4;
  titre("3. Consentement à être contacté(e) — à cocher canal par canal", 11);
  paragraphe(
    "Contrairement aux données de santé ci-dessus, vous contacter par email, SMS ou téléphone pour un rendez-vous, " +
      "un rappel ou une information commerciale nécessite votre consentement explicite, distinct pour chaque canal. " +
      "Cochez uniquement les cases correspondant à ce que vous acceptez — vous pouvez changer d'avis à tout moment, " +
      "sans justification, en le signalant à l'équipe.",
  );
  case_a_cocher("J'accepte d'être contacté(e) par email.");
  case_a_cocher("J'accepte d'être contacté(e) par SMS.");
  case_a_cocher("J'accepte d'être contacté(e) par téléphone.");

  y -= 20;
  page.drawText("Fait à _______________________, le ____ / ____ / ________", {
    x: marge,
    y,
    size: 10,
    font: police,
  });
  y -= 40;
  page.drawText("Signature du client :", { x: marge, y, size: 10, font: police });
  page.drawRectangle({ x: marge, y: y - 70, width: largeurTexte, height: 70, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });

  page.drawText(
    "Une fois signé, ce document doit être scanné et téléversé dans le dossier (pièce \"Consentement RGPD\") — il " +
      "constitue la preuve du recueil de ce consentement en cas de contrôle ou de litige.",
    { x: marge, y: 40, size: 8, font: police, color: rgb(0.4, 0.4, 0.4) },
  );

  return doc.save();
}
