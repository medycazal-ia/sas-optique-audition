/**
 * Identifiants des deux comptes démo — module volontairement sans aucune
 * dépendance serveur (pas de Prisma, pas de bcrypt, pas de fs) : c'est de la
 * donnée pure, importable aussi bien depuis un composant client (pour les
 * afficher dans la bascule "mode démo") que depuis src/lib/demo.ts côté
 * serveur (pour créer/reconnaître ces comptes).
 */

export const IDENTIFIANTS_DEMO = {
  directeur: { email: "directeur.demo@sas-optique.fr", motDePasse: "DemoDirecteur1" },
  collaborateur: { email: "collaborateur.demo@sas-optique.fr", motDePasse: "DemoCollab1" },
} as const;

const EMAILS_DEMO: string[] = [IDENTIFIANTS_DEMO.directeur.email, IDENTIFIANTS_DEMO.collaborateur.email];

export function estCompteDemo(email: string | null | undefined): boolean {
  if (!email) return false;
  return EMAILS_DEMO.includes(email.trim().toLowerCase());
}
