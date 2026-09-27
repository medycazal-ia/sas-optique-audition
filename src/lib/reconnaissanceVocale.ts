"use client";

/**
 * Reconnaissance vocale du navigateur (Web Speech API) — types minimaux
 * déclarés ici plutôt que d'ajouter une dépendance : l'API n'est pas dans
 * le lib.dom.d.ts standard de TypeScript, et les préfixes navigateur
 * varient (Chrome expose webkitSpeechRecognition). Partagé entre
 * components/AssistantVocal.tsx et la carte Audit (questionnaire guidé,
 * voir DossierDetailClient.tsx).
 */
export interface EvenementResultatVocal {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

export interface ReconnaissanceVocale {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((evenement: EvenementResultatVocal) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ReconnaissanceVocale;
    webkitSpeechRecognition?: new () => ReconnaissanceVocale;
  }
}

export function constructeurReconnaissanceVocale(): (new () => ReconnaissanceVocale) | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}
