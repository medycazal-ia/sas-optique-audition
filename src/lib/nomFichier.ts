/**
 * Nettoie un composant de nom de fichier généré automatiquement : minuscules,
 * accents retirés, tout ce qui n'est pas alphanumérique remplacé par "-".
 * Partagé par tous les générateurs de PDF archivés dans les documents du
 * dossier (synthèse besoin, consentement RGPD…) pour un format homogène.
 */
export function normaliserPourNomFichier(valeur: string): string {
  return (
    valeur
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "x"
  );
}
