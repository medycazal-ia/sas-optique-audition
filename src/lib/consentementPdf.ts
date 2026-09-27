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
      "droits, adressez-vous directement à l'équipe qui vous a remis ce document. Si vous estimez que vos droits ne " +
      "sont pas respectés, vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).",
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

export type MethodeSignatureConsentement = "ecran" | "pad" | "sms";

/**
 * Génère le document RGPD réellement signé (par écran, stylet/tactile ou
 * code SMS) — même contenu informatif que le formulaire papier ci-dessus,
 * mais avec les cases de consentement déjà cochées selon le choix du client
 * et une preuve de signature intégrée (au lieu d'un formulaire vierge à
 * imprimer). C'est ce PDF qui est archivé comme document du dossier (type
 * CONSENTEMENT_RGPD) pour ces trois moyens de signature — voir
 * app/api/dossiers/[id]/consentements/signer/route.ts et
 * .../signature-sms/verifier/route.ts.
 */
export async function genererConsentementRgpdSigne(params: {
  prenom: string;
  nom: string;
  consentementEmail: boolean;
  consentementSms: boolean;
  consentementTelephone: boolean;
  methode: MethodeSignatureConsentement;
  signaturePng?: Uint8Array;
  telephone?: string | null;
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
    for (const mot of mots) {
      const essai = ligne ? `${ligne} ${mot}` : mot;
      if (police.widthOfTextAtSize(essai, taille) > largeurTexte) {
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

  function caseCochee(libelle: string, coche: boolean) {
    page.drawRectangle({
      x: marge,
      y: y - 9,
      width: 12,
      height: 12,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 1,
      color: coche ? rgb(0.06, 0.4, 0.25) : undefined,
    });
    if (coche) {
      page.drawText("✓", { x: marge + 1.5, y: y - 8.5, size: 10, font: policeGras, color: rgb(1, 1, 1) });
    }
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
      "droits, adressez-vous directement à l'équipe qui vous a remis ce document. Si vous estimez que vos droits ne " +
      "sont pas respectés, vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).",
  );

  y -= 4;
  titre("3. Consentement à être contacté(e)", 11);
  paragraphe(
    "Contrairement aux données de santé ci-dessus, vous contacter par email, SMS ou téléphone pour un rendez-vous, " +
      "un rappel ou une information commerciale nécessite votre consentement explicite. Voici les choix que vous avez " +
      "validés, canal par canal — modifiables à tout moment sans justification, en le signalant à l'équipe.",
  );
  caseCochee("J'accepte d'être contacté(e) par email.", params.consentementEmail);
  caseCochee("J'accepte d'être contacté(e) par SMS.", params.consentementSms);
  caseCochee("J'accepte d'être contacté(e) par téléphone.", params.consentementTelephone);

  y -= 14;
  titre("4. Preuve de signature électronique", 11);
  const maintenant = new Date();
  const horodatage = `${maintenant.toLocaleDateString("fr-FR")} à ${maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  if (params.methode === "ecran") {
    paragraphe(`Consentement donné directement à l'écran de l'application, le ${horodatage}.`);
  } else if (params.methode === "sms") {
    paragraphe(
      `Signature électronique par code à usage unique envoyé par SMS${params.telephone ? ` au ${params.telephone}` : ""}, vérifié le ${horodatage}.`,
    );
  } else if (params.signaturePng) {
    paragraphe(`Signature manuscrite recueillie au stylet/à l'écran tactile, le ${horodatage}.`);
    const image = await doc.embedPng(params.signaturePng);
    const largeurImage = 220;
    const hauteurImage = (image.height / image.width) * largeurImage;
    page.drawRectangle({ x: marge, y: y - hauteurImage - 10, width: largeurImage + 20, height: hauteurImage + 20, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });
    page.drawImage(image, { x: marge + 10, y: y - hauteurImage, width: largeurImage, height: hauteurImage });
    y -= hauteurImage + 30;
  }

  page.drawText(
    "Ce document constitue la preuve du recueil de ce consentement en cas de contrôle ou de litige — conservé " +
      "automatiquement dans les documents du dossier.",
    { x: marge, y: 40, size: 8, font: police, color: rgb(0.4, 0.4, 0.4) },
  );

  return doc.save();
}
