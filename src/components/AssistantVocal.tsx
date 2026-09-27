"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Reconnaissance vocale du navigateur (Web Speech API) — types minimaux
 * déclarés ici plutôt que d'ajouter une dépendance : l'API n'est pas dans
 * le lib.dom.d.ts standard de TypeScript, et les préfixes navigateur
 * varient (Chrome expose webkitSpeechRecognition).
 */
interface EvenementResultatVocal {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface ReconnaissanceVocale {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((evenement: EvenementResultatVocal) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ReconnaissanceVocale;
    webkitSpeechRecognition?: new () => ReconnaissanceVocale;
  }
}

function constructeurReconnaissanceVocale(): (new () => ReconnaissanceVocale) | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

/**
 * Fait parler le navigateur (Web Speech API — synthèse, gratuite, aucun
 * appel serveur) : pour que l'assistant pose lui-même une question
 * ("Confirmer ?") plutôt que de se contenter d'afficher du texte. `onFin`
 * sert à enchaîner une nouvelle écoute juste après (dialogue question →
 * réponse), jamais appelé si la synthèse vocale n'est pas disponible.
 */
function parler(texte: string, onFin?: () => void) {
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

type EtatEcoute = "inactif" | "ecoute" | "traitement";

type ReponseAssistantVocal =
  | { type: "navigation"; url: string; libelle: string }
  | { type: "resultats_patients"; personnes: { id: string; nom: string; prenom: string | null }[] }
  | { type: "confirmation"; description: string; action: string; parametres: Record<string, unknown> }
  | { type: "message"; texte: string }
  | { erreur: string };

const PAGES_SANS_ASSISTANT = new Set(["/connexion", "/premiere-connexion"]);

/**
 * Bouton micro flottant — commande vocale du logiciel en langage libre, pas
 * de phrases figées façon "Hey Google"/Alexa : le navigateur transcrit ce
 * qui est dit, et l'IA choisit parmi un ensemble fermé d'actions autorisées
 * (voir lib/assistantVocal.ts) laquelle correspond. Masqué sur les écrans
 * de connexion (inutile avant authentification, et l'API refuse en 401),
 * et si le navigateur ne supporte pas la reconnaissance vocale.
 */
export default function AssistantVocal() {
  const router = useRouter();
  const pathname = usePathname();
  const [etat, setEtat] = useState<EtatEcoute>("inactif");
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resultats, setResultats] = useState<{ id: string; nom: string; prenom: string | null }[] | null>(null);
  const [confirmation, setConfirmation] = useState<{ description: string; action: string; parametres: Record<string, unknown> } | null>(null);
  const [supporte] = useState(() => Boolean(constructeurReconnaissanceVocale()));
  const reconnaissanceRef = useRef<ReconnaissanceVocale | null>(null);
  // Miroir de `confirmation`, lu depuis le callback onresult (défini une
  // seule fois dans l'effet ci-dessous) : un state React resterait figé à sa
  // valeur du premier rendu dans ce callback, la ref reste toujours à jour.
  const confirmationRef = useRef<{ description: string; action: string; parametres: Record<string, unknown> } | null>(null);
  useEffect(() => {
    confirmationRef.current = confirmation;
  }, [confirmation]);

  async function envoyerCommande(texte: string) {
    setEtat("traitement");
    setMessage(null);
    setResultats(null);
    setConfirmation(null);
    try {
      const reponse = await fetch("/api/assistant-vocal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte }),
      });
      const data: ReponseAssistantVocal = await reponse.json();
      if (!reponse.ok || "erreur" in data) {
        const texte = "erreur" in data ? data.erreur : "Erreur.";
        setMessage(texte);
        parler(texte);
      } else if (data.type === "navigation") {
        const texte = `Ouverture : ${data.libelle}`;
        setMessage(texte);
        parler(texte);
        router.push(data.url);
      } else if (data.type === "resultats_patients") {
        if (data.personnes.length === 0) {
          const texte = "Aucun patient trouvé.";
          setMessage(texte);
          parler(texte);
        } else if (data.personnes.length === 1) {
          const p = data.personnes[0];
          // Volontairement générique, sans nom ni prénom : dit/affiché dans un
          // magasin, à portée d'oreille d'autres clients — voir lib/assistantVocal.ts.
          const texte = "Dossier ouvert.";
          setMessage(texte);
          parler(texte);
          router.push(`/dossiers/${p.id}`);
        } else {
          setResultats(data.personnes);
          parler("Plusieurs patients trouvés — choisissez dans la liste.");
        }
      } else if (data.type === "confirmation") {
        setConfirmation({ description: data.description, action: data.action, parametres: data.parametres });
        // Enchaîne une écoute juste après avoir posé la question, pour un
        // vrai dialogue question → réponse sans reclic sur le micro.
        parler(data.description, () => demarrer());
      } else {
        setMessage(data.texte);
        parler(data.texte);
      }
    } catch {
      const texte = "Erreur réseau.";
      setMessage(texte);
      parler(texte);
    } finally {
      setEtat("inactif");
    }
  }

  async function confirmerAction() {
    if (!confirmation) return;
    setEtat("traitement");
    try {
      const reponse = await fetch("/api/assistant-vocal/executer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: confirmation.action, parametres: confirmation.parametres }),
      });
      const data: ReponseAssistantVocal = await reponse.json();
      const texte = !reponse.ok || "erreur" in data ? ("erreur" in data ? data.erreur : "Erreur.") : "texte" in data ? data.texte : "Fait.";
      setMessage(texte);
      parler(texte);
      router.refresh();
    } catch {
      const texte = "Erreur réseau.";
      setMessage(texte);
      parler(texte);
    } finally {
      setConfirmation(null);
      setEtat("inactif");
    }
  }

  function annulerAction() {
    setConfirmation(null);
    setMessage("Action annulée.");
    parler("Action annulée.");
  }

  useEffect(() => {
    const Ctor = constructeurReconnaissanceVocale();
    if (!Ctor) return;
    const reconnaissance = new Ctor();
    reconnaissance.lang = "fr-FR";
    reconnaissance.continuous = false;
    reconnaissance.interimResults = false;
    reconnaissance.onresult = (evenement) => {
      const texte = evenement.results[0]?.[0]?.transcript ?? "";
      setTranscript(texte);
      if (confirmationRef.current) {
        const normalise = texte
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase();
        if (/\b(confirme|confirmer|oui|valide|d'accord)\b/.test(normalise)) {
          setEtat("inactif");
          confirmerAction();
          return;
        }
        if (/\b(annule|annuler|non)\b/.test(normalise)) {
          setEtat("inactif");
          annulerAction();
          return;
        }
        // Ni confirmation ni annulation reconnue dans ce qui a été dit : on
        // ne bloque plus les commandes suivantes sur une confirmation restée
        // sans réponse (bug constaté : "ouvre le dossier de X" après une
        // confirmation ignorée était pris pour une non-réponse et ré-affiché
        // "dites confirme ou annule" au lieu d'être traité). On traite donc
        // ce qui a été dit comme une commande normale — envoyerCommande
        // efface elle-même la confirmation en attente au passage.
      }
      envoyerCommande(texte);
    };
    reconnaissance.onerror = () => {
      setEtat("inactif");
      setMessage("Erreur de reconnaissance vocale — réessayez.");
    };
    reconnaissance.onend = () => {
      setEtat((etatActuel) => (etatActuel === "ecoute" ? "inactif" : etatActuel));
    };
    reconnaissanceRef.current = reconnaissance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function demarrer() {
    if (!reconnaissanceRef.current) return;
    setMessage(null);
    setResultats(null);
    // Ne réinitialise volontairement pas `confirmation` : cliquer le micro
    // pour dire "confirme" doit la laisser affichée le temps de traiter la
    // réponse (voir onresult, qui la lit via confirmationRef).
    setTranscript("");
    setEtat("ecoute");
    try {
      reconnaissanceRef.current.start();
    } catch {
      // déjà démarrée — ignore (double-clic rapide).
    }
  }

  if (!supporte || PAGES_SANS_ASSISTANT.has(pathname)) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {(message || resultats || confirmation || (etat !== "inactif" && transcript)) && (
        <div className="max-w-xs rounded-xl border border-neutral-200 bg-white p-3 text-sm shadow-lg">
          {transcript && etat !== "inactif" && <p className="text-xs italic text-neutral-500">« {transcript} »</p>}
          {message && <p className="mt-1 text-neutral-800">{message}</p>}
          {resultats && (
            <ul className="mt-1 flex flex-col gap-1">
              {resultats.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => router.push(`/dossiers/${p.id}`)}
                    className="text-left text-orange-600 underline hover:text-orange-700"
                  >
                    {[p.prenom, p.nom].filter(Boolean).join(" ")}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {confirmation && (
            <div className="mt-1 flex flex-col gap-2">
              <p className="text-neutral-800">{confirmation.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={confirmerAction}
                  disabled={etat === "traitement"}
                  className="rounded-md bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  Confirmer
                </button>
                <button
                  onClick={annulerAction}
                  disabled={etat === "traitement"}
                  className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <button
        onClick={demarrer}
        disabled={etat !== "inactif"}
        className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-xl transition disabled:opacity-70 ${
          etat === "ecoute" ? "animate-pulse bg-red-500 text-white" : "bg-neutral-900 text-white hover:scale-105"
        }`}
        title="Commande vocale"
      >
        🎙️
      </button>
    </div>
  );
}
