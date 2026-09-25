import { prisma } from "@/lib/prisma";
import { hacherMotDePasse } from "@/lib/auth";
import { supprimerFichiersPersonne } from "@/lib/stockageFichiers";
import { IDENTIFIANTS_DEMO } from "@/lib/identifiantsDemo";

export { IDENTIFIANTS_DEMO, estCompteDemo } from "@/lib/identifiantsDemo";

/**
 * Mode démo — comptes et dossiers fictifs prêts à l'emploi, pour montrer
 * la différence directeur/collaborateur sans avoir à créer de vrais
 * comptes ou dossiers pendant une présentation. Ré-exécutable sans risque
 * (upsert) : identifiants toujours identiques et prévisibles, même après
 * plusieurs déclenchements.
 *
 * Tout ce qui est créé en étant connecté avec l'un des deux comptes démo
 * part réellement en base, comme n'importe quelle donnée (voir
 * estCompteDemo + Personne.estDemo) — la réinitialisation ci-dessous est le
 * seul endroit de l'application qui supprime réellement des données,
 * justement parce que ce ne sont jamais de vraies données client.
 */

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
      await prisma.personne.create({ data: { ...d, estDemo: true } });
      dossiersCrees.push(`${d.prenom} ${d.nom}`);
    }
  }

  return { directeur, collaborateur, dossiersCrees };
}

/**
 * Supprime pour de bon tout ce qui a été marqué `estDemo` : les dossiers
 * d'exemple et tout ce qu'un compte démo a pu créer depuis (propositions,
 * commandes, factures, SAV…), dans l'ordre imposé par les clés étrangères —
 * y compris le cycle Commande ↔ SAV (une commande de remplacement référence
 * son SAV d'origine), cassé en détachant d'abord ce lien. Les comptes démo
 * eux-mêmes ne sont pas supprimés : ils seront simplement réutilisés au
 * prochain amorçage.
 */
export async function reinitialiserDonneesDemo() {
  const personnes = await prisma.personne.findMany({ where: { estDemo: true }, select: { id: true } });
  const personneIds = personnes.map((p) => p.id);

  if (personneIds.length === 0) {
    return { dossiersSupprimes: 0 };
  }

  await prisma.$transaction(async (tx) => {
    const commandes = await tx.commande.findMany({
      where: { personneId: { in: personneIds } },
      select: { id: true },
    });
    const commandeIds = commandes.map((c) => c.id);

    // Casse le cycle Commande.savId -> SAV avant de pouvoir supprimer les SAV.
    await tx.commande.updateMany({ where: { id: { in: commandeIds } }, data: { savId: null } });

    const factures = await tx.facture.findMany({
      where: { personneId: { in: personneIds } },
      select: { id: true },
    });
    const factureIds = factures.map((f) => f.id);

    await tx.paiement.deleteMany({ where: { factureId: { in: factureIds } } });
    await tx.avoir.deleteMany({ where: { factureId: { in: factureIds } } });
    await tx.facture.deleteMany({ where: { id: { in: factureIds } } });

    await tx.sAV.deleteMany({ where: { personneId: { in: personneIds } } });
    await tx.livraison.deleteMany({ where: { personneId: { in: personneIds } } });
    await tx.commandeLigne.deleteMany({ where: { commandeId: { in: commandeIds } } });
    await tx.commande.deleteMany({ where: { id: { in: commandeIds } } });

    const propositions = await tx.proposition.findMany({
      where: { personneId: { in: personneIds } },
      select: { id: true },
    });
    const propositionIds = propositions.map((p) => p.id);

    await tx.demandePriseEnCharge.deleteMany({ where: { propositionId: { in: propositionIds } } });
    await tx.propositionLigne.deleteMany({ where: { propositionId: { in: propositionIds } } });
    await tx.proposition.deleteMany({ where: { id: { in: propositionIds } } });

    await tx.document.deleteMany({ where: { personneId: { in: personneIds } } });
    await tx.ordonnance.deleteMany({ where: { personneId: { in: personneIds } } });
    await tx.evenement.deleteMany({ where: { personneId: { in: personneIds } } });

    await tx.personne.deleteMany({ where: { id: { in: personneIds } } });
  });

  for (const id of personneIds) {
    await supprimerFichiersPersonne(id);
  }

  return { dossiersSupprimes: personneIds.length };
}
