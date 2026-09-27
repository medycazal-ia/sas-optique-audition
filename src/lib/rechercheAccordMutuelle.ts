import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/evenements";

export type ResultatRechercheAccord =
  | { ok: true; declenche: boolean; resultats: { boite: string; ok: boolean; erreur?: string }[] }
  | { ok: false; erreur: string; status: number };

/**
 * Déclenche une exécution immédiate du/des scénario(s) Make qui surveillent
 * les boîtes mail tiers payant concernées par le dossier `personneId`, au
 * lieu d'attendre leur prochain passage planifié — voir
 * /api/dossiers/:id/recherche-accord (bouton "🔍 Relancer la recherche") et
 * l'assistant vocal (components/AssistantVocal.tsx), qui appellent tous
 * deux cette même fonction pour ne jamais dupliquer la logique.
 */
export async function declencherRechercheAccordMutuelle(personneId: string, acteur?: string): Promise<ResultatRechercheAccord> {
  const personne = await prisma.personne.findUnique({ where: { id: personneId } });
  if (!personne) {
    return { ok: false, erreur: "Dossier introuvable.", status: 404 };
  }

  const apiToken = process.env.MAKE_API_TOKEN;
  if (!apiToken) {
    return { ok: false, erreur: "Relance indisponible : MAKE_API_TOKEN n'est pas configuré sur le serveur.", status: 503 };
  }
  const zone = process.env.MAKE_ZONE ?? "eu1.make.com";

  const nomsPlateformes = [personne.mutuelleNom, personne.mutuelle2Nom].filter((n): n is string => Boolean(n)).map((n) => n.toLowerCase());

  const boites = await prisma.boiteMailTiersPayant.findMany({ where: { actif: true, makeScenarioId: { not: null } } });
  const boitesConcernees = boites.filter(
    (b) => b.plateformes.length === 0 || b.plateformes.some((p) => nomsPlateformes.includes(p.toLowerCase())),
  );

  if (boitesConcernees.length === 0) {
    return { ok: false, erreur: "Aucune boîte mail configurée (Super Admin > Boîtes mail tiers payant) pour relancer la recherche.", status: 409 };
  }

  const resultats: { boite: string; ok: boolean; erreur?: string }[] = [];
  for (const boite of boitesConcernees) {
    try {
      const reponse = await fetch(`https://${zone}/api/v2/scenarios/${boite.makeScenarioId}/run`, {
        method: "POST",
        headers: { Authorization: `Token ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (reponse.ok) {
        resultats.push({ boite: boite.nom, ok: true });
        continue;
      }
      const corpsErreur = await reponse.json().catch(() => null);
      const messageErreur: string = corpsErreur?.message ?? corpsErreur?.detail?.message ?? "";
      // Le scénario Make peut déjà être en cours d'exécution (passage planifié
      // ou clic précédent) au moment du clic — ce n'est pas un échec : une
      // recherche est bel et bien en train de se faire, inutile d'en relancer
      // une deuxième en parallèle.
      if (/already being executed/i.test(messageErreur)) {
        resultats.push({ boite: boite.nom, ok: true, erreur: "Une recherche est déjà en cours pour cette boîte — pas besoin d'en relancer une autre." });
        continue;
      }
      resultats.push({ boite: boite.nom, ok: false, erreur: messageErreur || `HTTP ${reponse.status}` });
    } catch (e) {
      resultats.push({ boite: boite.nom, ok: false, erreur: e instanceof Error ? e.message : "Erreur réseau." });
    }
  }

  await journaliser({
    type: "demande-mutuelle.recherche_relancee",
    entite: "Personne",
    entiteId: personneId,
    personneId,
    acteur,
    donnees: { resultats },
  });

  return { ok: true, declenche: resultats.some((r) => r.ok), resultats };
}
