import { prisma } from "@/lib/prisma";

export type AnalyseBeneficiaire = {
  /** Le NSS lu/saisi correspond-il à celui déjà enregistré pour ce dossier ? Null si l'un des deux est absent. */
  correspondACeDossier: boolean | null;
  /** Une autre personne du même foyer porte ce NSS : ce dossier en est probablement l'ayant droit. */
  assurePrincipal: { id: string; prenom: string; nom: string } | null;
};

/**
 * Compare un NSS lu sur une carte de mutuelle (ou saisi à la main) à celui
 * du dossier, et — si le dossier appartient à un foyer — aux autres
 * membres de ce même foyer, pour repérer un ayant droit (le NSS d'une
 * carte de mutuelle est presque toujours celui de l'assuré principal,
 * partagé par ses ayants droits). Volontairement borné au même foyer : ne
 * cherche jamais à travers tous les dossiers de la base (frontière de
 * confiance déjà établie par le modèle Foyer).
 */
export async function analyserBeneficiaire(
  personneId: string,
  numeroSecuriteSociale: string | null,
): Promise<AnalyseBeneficiaire> {
  if (!numeroSecuriteSociale) {
    return { correspondACeDossier: null, assurePrincipal: null };
  }

  const personne = await prisma.personne.findUnique({
    where: { id: personneId },
    select: { numeroSecuriteSociale: true, foyerId: true },
  });
  if (!personne) {
    return { correspondACeDossier: null, assurePrincipal: null };
  }

  const correspondACeDossier = personne.numeroSecuriteSociale
    ? personne.numeroSecuriteSociale === numeroSecuriteSociale
    : null;

  let assurePrincipal: AnalyseBeneficiaire["assurePrincipal"] = null;
  if (!correspondACeDossier && personne.foyerId) {
    assurePrincipal = await prisma.personne.findFirst({
      where: { foyerId: personne.foyerId, numeroSecuriteSociale, id: { not: personneId } },
      select: { id: true, prenom: true, nom: true },
    });
  }

  return { correspondACeDossier, assurePrincipal };
}
