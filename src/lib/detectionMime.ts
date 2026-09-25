/**
 * Détecte le type MIME réel d'un fichier par ses premiers octets ("magic
 * bytes") plutôt que par sa seule extension — un fichier renommé, ou un
 * type non standard (HEIC d'iPhone, TIFF d'un scanner...) envoyé avec la
 * mauvaise étiquette à l'IA de vision produirait sinon une image
 * indéchiffrable et une réponse en texte libre au lieu du JSON attendu.
 * Ne couvre que les types acceptés par l'API Claude (JPEG/PNG/GIF/WEBP/PDF)
 * — un type non reconnu retombe sur l'extension, dernier recours.
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
  }

  const ext = nomFichier.toLowerCase().split(".").pop() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "pdf") return "application/pdf";
  return "image/jpeg";
}
