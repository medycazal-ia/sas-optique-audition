/**
 * URL publique fixe du site — à utiliser pour toute URL absolue destinée à
 * sortir du serveur (QR code à scanner depuis un téléphone, redirection de
 * retour après un flux externe comme OAuth, lien à coller dans un email...).
 *
 * Ne jamais la déduire de la requête entrante (request.nextUrl.origin) :
 * sur Render, la requête est transmise en interne via un proxy, et
 * l'origine que Next.js en déduit peut ne pas correspondre à l'URL
 * publique réelle — observé en pratique, un visiteur redirigé vers
 * "https://localhost:10000/..." (l'adresse d'écoute interne du serveur)
 * au lieu du domaine public. SITE_URL permet aussi de migrer vers
 * facilog.site en un seul endroit, le jour où ce domaine est branché.
 */
export const SITE_URL = process.env.SITE_URL ?? "https://sas-optique-audition.onrender.com";
