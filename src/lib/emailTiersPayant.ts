import { Resend } from "resend";

/**
 * Envoi automatique par email d'une demande de prise en charge — la partie
 * réellement automatisable de "télétransmission automatique type OMC ou
 * mail" : une intégration EDI/API directe avec les plateformes de tiers
 * payant (Viamédis, Almerys, iSanté, SP Santé, Carte Blanche...) suppose un
 * agrément propre à l'éditeur logiciel et des identifiants professionnels
 * par plateforme — ni recherchables ni fabriquables ici (voir la note du
 * modèle DemandePriseEnCharge dans prisma/schema.prisma). L'envoi par email
 * est en revanche une automatisation réelle et immédiatement disponible.
 *
 * RESEND_FROM doit être une adresse de votre propre domaine vérifié sur
 * resend.com : l'adresse de test par défaut ("onboarding@resend.dev") ne
 * peut envoyer qu'à l'adresse du compte Resend lui-même, pas à un tiers.
 */

const EXPEDITEUR_PAR_DEFAUT = "onboarding@resend.dev";

export type DemandeEmailContenu = {
  destinataire: string;
  reference: string;
  assure: { prenom: string; nom: string; numeroSecuriteSociale: string | null };
  mutuelle: { nom: string | null; numeroAdherent: string | null; numeroContrat: string | null; plateforme: string | null };
  prescripteur: { finess: string | null; rpps: string | null };
  proposition: { creeA: Date; totalTTC: number; libelles: string[] };
};

function composerTexte(c: DemandeEmailContenu): string {
  const lignes: (string | null)[] = [
    "Demande de prise en charge — tiers payant optique",
    "",
    `Assuré(e) : ${c.assure.prenom} ${c.assure.nom}`,
    c.assure.numeroSecuriteSociale ? `N° de sécurité sociale : ${c.assure.numeroSecuriteSociale}` : null,
    "",
    `Mutuelle : ${c.mutuelle.nom ?? "non renseignée"}`,
    c.mutuelle.numeroAdherent ? `N° adhérent : ${c.mutuelle.numeroAdherent}` : null,
    c.mutuelle.numeroContrat ? `N° contrat : ${c.mutuelle.numeroContrat}` : null,
    c.mutuelle.plateforme ? `Plateforme tiers payant : ${c.mutuelle.plateforme}` : null,
    "",
    c.prescripteur.finess
      ? `FINESS du cabinet prescripteur : ${c.prescripteur.finess}`
      : "⚠️ FINESS du prescripteur non renseigné",
    c.prescripteur.rpps ? `RPPS du praticien : ${c.prescripteur.rpps}` : null,
    "",
    `Devis du ${c.proposition.creeA.toLocaleDateString("fr-FR")} :`,
    ...c.proposition.libelles.map((l) => `  - ${l}`),
    `Montant total TTC : ${(c.proposition.totalTTC / 100).toFixed(2)} €`,
    "",
    `Référence dossier : ${c.reference}`,
  ];
  return lignes.filter((l): l is string => l !== null).join("\n");
}

export async function envoyerDemandeParEmail(contenu: DemandeEmailContenu): Promise<void> {
  const cleApi = process.env.RESEND_API_KEY;
  if (!cleApi) {
    throw new Error("Envoi par email indisponible : RESEND_API_KEY n'est pas configurée sur le serveur.");
  }

  const client = new Resend(cleApi);
  const { error } = await client.emails.send({
    from: process.env.RESEND_FROM ?? EXPEDITEUR_PAR_DEFAUT,
    to: contenu.destinataire,
    subject: `Demande de prise en charge — ${contenu.assure.prenom} ${contenu.assure.nom}`,
    text: composerTexte(contenu),
  });

  if (error) {
    throw new Error(`Échec de l'envoi de l'email : ${error.message}`);
  }
}
