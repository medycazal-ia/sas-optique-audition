"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Magasin, Produit, Stock } from "@prisma/client";

type ProduitAvecStocks = Produit & { stocks: (Stock & { magasin: Magasin })[] };

export default function ScanProduitClient({
  produit,
  magasins,
}: {
  produit: ProduitAvecStocks;
  magasins: Magasin[];
}) {
  const router = useRouter();
  const [magasinId, setMagasinId] = useState(produit.stocks[0]?.magasinId ?? magasins[0]?.id ?? "");
  const quantiteActuelle = produit.stocks.find((s) => s.magasinId === magasinId)?.quantite ?? 0;
  const [quantite, setQuantite] = useState(quantiteActuelle);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function choisirMagasin(id: string) {
    setMagasinId(id);
    setQuantite(produit.stocks.find((s) => s.magasinId === id)?.quantite ?? 0);
    setMessage(null);
  }

  async function valider(nouvelleQuantite: number) {
    if (!magasinId || nouvelleQuantite < 0) return;
    setEnvoi(true);
    setMessage(null);
    const reponse = await fetch(`/api/produits/${produit.id}/stock`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ magasinId, quantite: nouvelleQuantite }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      setQuantite(nouvelleQuantite);
      setMessage("✅ Stock mis à jour.");
      router.refresh();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setMessage(data.erreur ?? "Erreur lors de la mise à jour.");
    }
  }

  return (
    <div className="mt-6 flex flex-1 flex-col">
      <div className="rounded-[28px] border border-neutral-200 bg-white p-6 text-center shadow-lg">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-3xl shadow-md mx-auto">
          📦
        </span>
        <h1 className="mt-3 text-xl font-extrabold text-neutral-900">
          {produit.marque} {produit.modele}
        </h1>
        <p className="text-sm text-neutral-500">réf. {produit.reference}</p>

        {magasins.length > 1 && (
          <select
            value={magasinId}
            onChange={(e) => choisirMagasin(e.target.value)}
            className="mt-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {magasins.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        )}

        <p className="mt-6 text-sm text-neutral-500">Quantité en stock</p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <button
            onClick={() => valider(Math.max(0, quantite - 1))}
            disabled={envoi || quantite <= 0}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-3xl font-bold text-neutral-700 shadow disabled:opacity-40"
          >
            −
          </button>
          <span className="w-20 text-4xl font-extrabold text-neutral-900">{quantite}</span>
          <button
            onClick={() => valider(quantite + 1)}
            disabled={envoi}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-3xl font-bold text-white shadow disabled:opacity-40"
          >
            +
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={quantite}
            onChange={(e) => setQuantite(Number(e.target.value))}
            className="w-full rounded-md border border-neutral-300 px-3 py-3 text-center text-lg"
          />
          <button
            onClick={() => valider(quantite)}
            disabled={envoi}
            className="shrink-0 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow disabled:opacity-50"
          >
            {envoi ? "…" : "Valider"}
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-neutral-600">{message}</p>}
      </div>
    </div>
  );
}
