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

type EtatEcoute = "inactif" | "ecoute" | "traitement";

type ReponseAssistantVocal =
  | { type: "navigation"; url: string; libelle: string }
  | { type: "resultats_patients"; personnes: { id: string; nom: string; prenom: string | null }[] }
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
  const [supporte, setSupporte] = useState(true);
  const reconnaissanceRef = useRef<ReconnaissanceVocale | null>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setSupporte(false);
      return;
    }
    const reconnaissance = new Ctor();
    reconnaissance.lang = "fr-FR";
    reconnaissance.continuous = false;
    reconnaissance.interimResults = false;
    reconnaissance.onresult = (evenement) => {
      const texte = evenement.results[0]?.[0]?.transcript ?? "";
      setTranscript(texte);
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

  async function envoyerCommande(texte: string) {
    setEtat("traitement");
    setMessage(null);
    setResultats(null);
    try {
      const reponse = await fetch("/api/assistant-vocal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte }),
      });
      const data: ReponseAssistantVocal = await reponse.json();
      if (!reponse.ok || "erreur" in data) {
        setMessage("erreur" in data ? data.erreur : "Erreur.");
      } else if (data.type === "navigation") {
        setMessage(`Ouverture : ${data.libelle}`);
        router.push(data.url);
      } else if (data.type === "resultats_patients") {
        if (data.personnes.length === 0) {
          setMessage("Aucun patient trouvé.");
        } else if (data.personnes.length === 1) {
          const p = data.personnes[0];
          setMessage(`Ouverture du dossier de ${[p.prenom, p.nom].filter(Boolean).join(" ")}`);
          router.push(`/dossiers/${p.id}`);
        } else {
          setResultats(data.personnes);
        }
      } else {
        setMessage(data.texte);
      }
    } catch {
      setMessage("Erreur réseau.");
    } finally {
      setEtat("inactif");
    }
  }

  function demarrer() {
    if (!reconnaissanceRef.current) return;
    setMessage(null);
    setResultats(null);
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
      {(message || resultats || (etat !== "inactif" && transcript)) && (
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
