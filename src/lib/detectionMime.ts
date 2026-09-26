/**
 * Détecte le type MIME réel d'un fichier par ses premiers octets ("magic
 * bytes") plutôt que par sa seule extension — un fichier renommé, ou un
 * type non standard (HEIC d'iPhone, TIFF d'un scanner...) envoyé avec la
 * mauvaise étiquette à l'IA de vision produirait sinon une image
 * indéchiffrable et une réponse en texte libre au lieu du JSON attendu.
 * Couvre aussi TIFF/HEIC pour les identifier explicitement (voir
 * TYPES_NON_SUPPORTES_VISION) plutôt que de les faire passer à tort pour un
 * JPEG — l'API Claude les rejette sinon avec une erreur 400 opaque
 * ("Could not process image"). Un type non reconnu retombe sur l'extension,
 * dernier recours.
 */
export function detecterTypeMime(contenu: Buffer, nomFichier: string): string {
  if (contenu.length >= 4) {
    if (contenu[0] === 0x89 && contenu[1] === 0x50 && contenu[2] === 0x4e && contenu[3] === 0x47) {
      return "image/png";
    }
    if (contenu[0] === 0xff && contenu[1] === 0xd8 && contenu[2] === 0xff) {
      return "image/jpeg";
    }
    if (contenu.subarray(0, 4).toString("ascii") === "%PDF") {
      return "application/pdf";
    }
    if (contenu.subarray(0, 4).toString("ascii") === "GIF8") {
      return "image/gif";
    }
    if (
      contenu.length >= 12 &&
      contenu.subarray(0, 4).toString("ascii") === "RIFF" &&
      contenu.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return "image/webp";
    }
    if (
      (contenu[0] === 0x49 && contenu[1] === 0x49 && contenu[2] === 0x2a && contenu[3] === 0x00) ||
      (contenu[0] === 0x4d && contenu[1] === 0x4d && contenu[2] === 0x00 && contenu[3] === 0x2a)
    ) {
      return "image/tiff";
    }
    if (contenu.length >= 12 && contenu.subarray(4, 8).toString("ascii") === "ftyp") {
      const marque = contenu.subarray(8, 12).toString("ascii");
      if (/^hei[cs]$|^heix$|^hevc$|^mif1$|^msf1$/.test(marque)) {
        return "image/heic";
      }
    }
  }

  const ext = nomFichier.toLowerCase().split(".").pop() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "pdf") return "application/pdf";
  if (ext === "tif" || ext === "tiff") return "image/tiff";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

/** Formats réels mais non acceptés par l'API de vision Claude — à signaler explicitement plutôt qu'à envoyer à tort sous une autre étiquette. */
export const TYPES_NON_SUPPORTES_VISION = new Set(["image/tiff", "image/heic"]);

export function nomFormatNonSupporte(mediaType: string): string {
  return mediaType === "image/tiff" ? "TIFF" : mediaType === "image/heic" ? "HEIC" : mediaType;
}
