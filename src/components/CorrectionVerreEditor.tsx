"use client";

import { useState } from "react";
import { formaterCorrectionVerre, type CorrectionVerre } from "@/lib/correctionVerre";

type ChampsOeil = { sphere: string; cylindre: string; axe: string; addition: string };

function versChamps(c: CorrectionVerre, oeil: "OD" | "OG"): ChampsOeil {
  if (oeil === "OD") {
    return {
      sphere: c.sphereOD?.toString() ?? "",
      cylindre: c.cylindreOD?.toString() ?? "",
      axe: c.axeOD?.toString() ?? "",
      addition: c.additionOD?.toString() ?? "",
    };
  }
  return {
    sphere: c.sphereOG?.toString() ?? "",
    cylindre: c.cylindreOG?.toString() ?? "",
    axe: c.axeOG?.toString() ?? "",
    addition: c.additionOG?.toString() ?? "",
  };
}

/**
 * Affichage + édition de la correction optique (catégorie VERRE) d'une
 * ligne de proposition/commande — reprise sur devis, facture, commande et
 * SAV. Toujours modifiable via le bouton "Corriger" (pas un instantané
 * figé comme le reste de la ligne) : la validation/le bornage des valeurs
 * se fait côté serveur (lib/correctionVerre.ts > validerCorrectionVerre),
 * ce composant se contente de transmettre la saisie brute.
 */
export default function CorrectionVerreEditor({
  valeurs,
  onEnregistrer,
}: {
  valeurs: CorrectionVerre;
  onEnregistrer: (corps: { od: ChampsOeil; og: ChampsOeil }) => Promise<boolean>;
}) {
  const [edition, setEdition] = useState(false);
  const [od, setOd] = useState<ChampsOeil>(() => versChamps(valeurs, "OD"));
  const [og, setOg] = useState<ChampsOeil>(() => versChamps(valeurs, "OG"));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const texte = formaterCorrectionVerre(valeurs);

  async function enregistrer() {
    setEnvoi(true);
    setErreur(null);
    const ok = await onEnregistrer({ od, og });
    setEnvoi(false);
    if (ok) {
      setEdition(false);
    } else {
      setErreur("Erreur lors de l'enregistrement.");
    }
  }

  if (!edition) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span>{texte ?? "Correction verre non renseignée"}</span>
        <button
          onClick={() => setEdition(true)}
          className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 hover:bg-neutral-100"
        >
          ✏️ Corriger
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-xs">
      {(["OD", "OG"] as const).map((oeil) => {
        const champs = oeil === "OD" ? od : og;
        const setChamps = oeil === "OD" ? setOd : setOg;
        return (
          <div key={oeil} className="flex items-center gap-1">
            <span className="w-6 shrink-0 font-medium text-neutral-700">{oeil}</span>
            <input
              value={champs.sphere}
              onChange={(e) => setChamps({ ...champs, sphere: e.target.value })}
              placeholder="Sphère"
              className="w-16 rounded border border-neutral-300 px-1 py-0.5"
            />
            <input
              value={champs.cylindre}
              onChange={(e) => setChamps({ ...champs, cylindre: e.target.value })}
              placeholder="Cylindre"
              className="w-16 rounded border border-neutral-300 px-1 py-0.5"
            />
            <input
              value={champs.axe}
              onChange={(e) => setChamps({ ...champs, axe: e.target.value })}
              placeholder="Axe"
              className="w-14 rounded border border-neutral-300 px-1 py-0.5"
            />
            <input
              value={champs.addition}
              onChange={(e) => setChamps({ ...champs, addition: e.target.value })}
              placeholder="Addition"
              className="w-16 rounded border border-neutral-300 px-1 py-0.5"
            />
          </div>
        );
      })}
      {erreur && <p className="text-red-600">{erreur}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={enregistrer}
          disabled={envoi}
          className="rounded bg-neutral-900 px-2 py-1 font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {envoi ? "…" : "Enregistrer"}
        </button>
        <button onClick={() => setEdition(false)} className="text-neutral-500 hover:underline">
          Annuler
        </button>
      </div>
    </div>
  );
}
