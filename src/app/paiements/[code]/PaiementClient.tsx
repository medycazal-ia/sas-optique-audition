"use client";

import { useEffect, useState } from "react";
import { formaterPrix } from "@/lib/argent";

type Details = {
  id: string;
  rang: "PRINCIPALE" | "SECONDAIRE";
  statut: string;
  montantPriseEnChargeTTC: number | null;
  recuLeA: string | null;
  recuPar: string | null;
  mutuelleNom: string | null;
  personne: { prenom: string; nom: string };
};

const LIBELLE_RANG: Record<string, string> = { PRINCIPALE: "Mutuelle principale", SECONDAIRE: "Mutuelle secondaire" };

export default function PaiementClient({ code }: { code: string }) {
  const [details, setDetails] = useState<Details | null>(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/paiements/${code}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.erreur ?? "Code introuvable.");
        }
        return r.json();
      })
      .then(setDetails)
      .catch((e) => setErreur(e.message))
      .finally(() => setChargement(false));
  }, [code]);

  async function marquerRecu() {
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch(`/api/paiements/${code}`, { method: "POST" });
    setEnvoi(false);
    if (reponse.ok) {
      setDetails(await reponse.json());
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  if (chargement) {
    return <p className="mt-8 text-sm text-neutral-500">Chargement…</p>;
  }
  if (erreur && !details) {
    return <p className="mt-8 text-sm text-red-600">{erreur}</p>;
  }
  if (!details) return null;

  return (
    <div className="mt-6 rounded-[28px] border border-neutral-200 bg-white p-6 text-center shadow-lg">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-3xl shadow-md">
        💳
      </span>
      <h1 className="mt-3 text-lg font-extrabold text-neutral-900">Code paiement</h1>
      <p className="text-sm text-neutral-500">
        {details.personne.prenom} {details.personne.nom} · {LIBELLE_RANG[details.rang]}
        {details.mutuelleNom ? ` (${details.mutuelleNom})` : ""}
      </p>

      <p className="mt-6 text-sm text-neutral-500">Montant à rapprocher</p>
      <p className="text-3xl font-extrabold text-neutral-900">{formaterPrix(details.montantPriseEnChargeTTC ?? 0)}</p>

      {details.recuLeA ? (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ✅ Marqué reçu le {new Date(details.recuLeA).toLocaleDateString("fr-FR")}
          {details.recuPar ? ` par ${details.recuPar}` : ""}.
        </p>
      ) : (
        <button
          onClick={marquerRecu}
          disabled={envoi}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50"
        >
          {envoi ? "…" : "Marquer reçu"}
        </button>
      )}
      {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}

      <p className="mt-6 text-xs text-neutral-400">
        Simple rapprochement interne — aucun mouvement d&apos;argent n&apos;est déclenché par cette page.
      </p>
    </div>
  );
}
