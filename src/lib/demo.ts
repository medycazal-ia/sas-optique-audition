import { prisma } from "@/lib/prisma";
import { hacherMotDePasse } from "@/lib/auth";

/**
 * Mode démo — comptes et dossiers fictifs prêts à l'emploi, pour montrer
 * la différence directeur/collaborateur sans avoir à créer de vrais
 * comptes ou dossiers pendant une présentation. Ré-exécutable sans risque
 * (upsert) : identifiants toujours identiques et prévisibles, même après
 * plusieurs déclenchements.
 */

export const IDENTIFIANTS_DEMO = {
  directeur: { email: "directeur.demo@sas-optique.fr", motDePasse: "DemoDirecteur1" },
  collaborateur: { email: "collaborateur.demo@sas-optique.fr", motDePasse: "DemoCollab1" },
} as const;

const DOSSIERS_DEMO = [
  { prenom: "Sophie", nom: "Lambert", telephone: "0601020304" },
  { prenom: "Marc", nom: "Dubois", telephone: "0605060708" },
];

export async function amorcerDonneesDemo() {
  const directeurHash = await hacherMotDePasse(IDENTIFIANTS_DEMO.directeur.motDePasse);
  const directeur = await prisma.utilisateur.upsert({
    where: { email: IDENTIFIANTS_DEMO.directeur.email },
    update: { motDePasseHash: directeurHash, role: "DIRECTEUR", actif: true, banni: false },
    create: {
      email: IDENTIFIANTS_DEMO.directeur.email,
      nom: "Démo",
      prenom: "Directeur",
      motDePasseHash: directeurHash,
      role: "DIRECTEUR",
    },
    omit: { motDePasseHash: true },
  });

  const collaborateurHash = await hacherMotDePasse(IDENTIFIANTS_DEMO.collaborateur.motDePasse);
  const collaborateur = await prisma.utilisateur.upsert({
    where: { email: IDENTIFIANTS_DEMO.collaborateur.email },
    update: { motDePasseHash: collaborateurHash, role: "COLLABORATEUR", actif: true, banni: false },
    create: {
      email: IDENTIFIANTS_DEMO.collaborateur.email,
      nom: "Démo",
      prenom: "Collaborateur",
      motDePasseHash: collaborateurHash,
      role: "COLLABORATEUR",
    },
    omit: { motDePasseHash: true },
  });

  const dossiersCrees: string[] = [];
  for (const d of DOSSIERS_DEMO) {
    const existant = await prisma.personne.findFirst({ where: { prenom: d.prenom, nom: d.nom } });
    if (!existant) {
      await prisma.personne.create({ data: d });
      dossiersCrees.push(`${d.prenom} ${d.nom}`);
    }
  }

  return { directeur, collaborateur, dossiersCrees };
}
