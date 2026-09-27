import Anthropic from "@anthropic-ai/sdk";

/**
 * Construit le client Anthropic partagé par tous les modules d'OCR/vision.
 *
 * Certaines clés API sont créées au niveau de l'organisation plutôt que
 * rattachées à un workspace précis (Anthropic Console : "Create Key" sans
 * choisir de workspace) — l'API refuse alors toute requête tant qu'elle ne
 * précise pas explicitement `anthropic-workspace-id`. Plutôt que d'exiger
 * une clé toujours scopée à un workspace (source d'erreur silencieuse à
 * chaque rotation de clé), on accepte cet identifiant optionnel en variable
 * d'environnement et on l'ajoute comme en-tête par défaut quand il est
 * renseigné — sans effet si la clé est déjà scopée à un workspace.
 */
export function creerClientAnthropic(cleApi: string): Anthropic {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  return new Anthropic({
    apiKey: cleApi,
    defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
  });
}
