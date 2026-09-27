"use client";

/**
 * Fait parler le navigateur (Web Speech API — synthèse, gratuite, aucun
 * appel serveur) — partagé entre l'assistant vocal (components/AssistantVocal.tsx)
 * et le questionnaire guidé de la carte Audit (DossierDetailClient.tsx).
 * `onFin` sert à enchaîner une action juste après (question → écoute de la
 * réponse), jamais appelé si la synthèse vocale n'est pas disponible.
 */
export function parler(texte: string, onFin?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onFin?.();
    return;
  }
  window.speechSynthesis.cancel();
  const enonce = new SpeechSynthesisUtterance(texte);
  enonce.lang = "fr-FR";
  if (onFin) enonce.onend = () => onFin();
  window.speechSynthesis.speak(enonce);
}
