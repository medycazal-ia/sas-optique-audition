"use client";

import { useRef, useState } from "react";
import type { Magasin } from "@prisma/client";

type ResultatImport = {
  crees: number;
  misAJour: number;
  erreurs: { ligne: number; reference: string; erreur?: string }[];
};

export default function ImportCsvClient({
  magasins,
  magasinParDefautId = "",
}: {
  magasins: Magasin[];
  magasinParDefautId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [magasinId, setMagasinId] = useState(magasinParDefautId || magasins[0]?.id || "");
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<ResultatImport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function importer() {
    const fichier = inputRef.current?.files?.[0];
    if (!fichier) {
      setErreur("Choisissez un fichier .csv à importer.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    setResultat(null);
    try {
      const csv = await fichier.text();
      const reponse = await fetch("/api/produits/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, magasinId: magasinId || undefined }),
      });
      const data = await reponse.json();
      if (!reponse.ok) {
        setErreur(data.erreur ?? "Une erreur est survenue.");
      } else {
        setResultat(data);
      }
    } catch {
      setErreur("Impossible de lire ou d'envoyer ce fichier.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-neutral-900">1. Récupérer le modèle</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Colonnes : type, activite, reference, qrcode, categorie, marque, nom, taille, coloris, nomenclature,
          quantite, date_derniere_sortie, prix_achat, coefficient, prix_public_ttc, taux_tva, prix_vente_ht,
          plafond_remise, remarque.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="/api/produits/gabarit-csv"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            📄 Télécharger le modèle vide
          </a>
          <a
            href="/api/produits/export-csv"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            📦 Exporter le catalogue actuel
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-neutral-900">2. Importer un fichier rempli</h2>
        <label className="mt-3 block text-sm">
          Magasin à mettre à jour (colonne quantite)
          <select
            value={magasinId}
            onChange={(e) => setMagasinId(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">— Ne pas toucher au stock —</option>
            {magasins.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Fichier CSV
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="mt-1 block w-full text-sm" />
        </label>
        <button
          onClick={importer}
          disabled={envoi}
          className="mt-4 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105 disabled:opacity-50"
        >
          {envoi ? "Import en cours…" : "Importer"}
        </button>

        {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}

        {resultat && (
          <div className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm">
            <p className="font-medium text-neutral-800">
              {resultat.crees} créé{resultat.crees > 1 ? "s" : ""} · {resultat.misAJour} mis à jour
              {resultat.erreurs.length > 0 && ` · ${resultat.erreurs.length} en erreur`}
            </p>
            {resultat.erreurs.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-red-600">
                {resultat.erreurs.map((e, i) => (
                  <li key={i}>
                    Ligne {e.ligne} ({e.reference || "réf. manquante"}) : {e.erreur}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
