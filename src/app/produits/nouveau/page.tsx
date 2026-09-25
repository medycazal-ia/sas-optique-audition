"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parserPrixEnCentimes } from "@/lib/argent";

const TYPES = [
  { valeur: "MONTURE", libelle: "Monture" },
  { valeur: "VERRE", libelle: "Verre" },
  { valeur: "LENTILLE", libelle: "Lentille" },
  { valeur: "ACCESSOIRE", libelle: "Accessoire" },
];

export default function NouveauProduitPage() {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const form = new FormData(event.currentTarget);
    const prixTTC = parserPrixEnCentimes(String(form.get("prix") ?? ""));
    if (prixTTC === null) {
      setErreur("Prix invalide.");
      setEnvoi(false);
      return;
    }

    const payload = {
      type: form.get("type"),
      reference: form.get("reference"),
      marque: form.get("marque"),
      modele: form.get("modele"),
      description: form.get("description") || undefined,
      prixTTC,
    };

    try {
      const reponse = await fetch("/api/produits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await reponse.json();
      if (!reponse.ok) {
        setErreur(data.erreur ?? "Une erreur est survenue.");
        setEnvoi(false);
        return;
      }
      router.push(`/produits/${data.id}`);
    } catch {
      setErreur("Impossible de contacter le serveur.");
      setEnvoi(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <div className="flex items-center gap-3">
        <Link href="/produits" className="text-sm text-neutral-500 hover:underline">
          ← Retour au catalogue
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          Accueil
        </Link>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-2xl shadow-md">
          🧾
        </span>
        <h1 className="text-2xl font-extrabold text-neutral-900">Nouveau produit</h1>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-[28px] border border-neutral-200 bg-white p-6 shadow-lg">
        <label className="block text-sm">
          Type *
          <select name="type" required defaultValue="MONTURE" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            {TYPES.map((t) => (
              <option key={t.valeur} value={t.valeur}>
                {t.libelle}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Marque *
            <input name="marque" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            Modèle *
            <input name="modele" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </label>
        </div>

        <label className="block text-sm">
          Référence * (unique dans le catalogue)
          <input name="reference" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>

        <label className="block text-sm">
          Prix TTC (€) *
          <input name="prix" required placeholder="129,90" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>

        <label className="block text-sm">
          Description
          <textarea name="description" rows={3} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>

        {erreur && <p className="text-sm text-red-600">{erreur}</p>}

        <button
          type="submit"
          disabled={envoi}
          className="w-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50"
        >
          {envoi ? "Création…" : "Ajouter au catalogue"}
        </button>
      </form>
    </main>
  );
}
