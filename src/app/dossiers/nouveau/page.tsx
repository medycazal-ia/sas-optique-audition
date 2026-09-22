"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NouveauDossierPage() {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      civilite: form.get("civilite") || undefined,
      prenom: form.get("prenom"),
      nom: form.get("nom"),
      telephone: form.get("telephone") || undefined,
      email: form.get("email") || undefined,
    };

    try {
      const reponse = await fetch("/api/dossiers", {
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
      router.push(`/dossiers/${data.id}`);
    } catch {
      setErreur("Impossible de contacter le serveur.");
      setEnvoi(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <Link href="/dossiers" className="text-sm text-neutral-500 hover:underline">
        ← Retour aux dossiers
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-fuchsia-500 text-2xl shadow-md">
          🧾
        </span>
        <h1 className="text-2xl font-extrabold text-neutral-900">Nouveau dossier</h1>
      </div>
      <p className="mt-1 text-sm text-neutral-600">
        Strict minimum pour démarrer au comptoir : identité + un moyen de contact.
        Le reste (pièces, consentements, synthèse besoin) se complète ensuite sur
        la fiche du dossier.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-[28px] border border-neutral-200 bg-white p-6 shadow-lg">
        <div className="grid grid-cols-[100px_1fr_1fr] gap-3">
          <label className="text-sm">
            Civilité
            <select name="civilite" className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-2 text-sm">
              <option value=""></option>
              <option value="M.">M.</option>
              <option value="Mme">Mme</option>
            </select>
          </label>
          <label className="text-sm">
            Prénom *
            <input
              name="prenom"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Nom *
            <input
              name="nom"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm">
          Téléphone
          <input name="telephone" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>

        <label className="block text-sm">
          Email
          <input
            name="email"
            type="email"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>

        <p className="text-xs text-neutral-500">
          * Au moins téléphone ou email est requis pour pouvoir recontacter le client.
        </p>

        {erreur && <p className="text-sm text-red-600">{erreur}</p>}

        <button
          type="submit"
          disabled={envoi}
          className="w-full rounded-full bg-gradient-to-r from-orange-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] hover:shadow-xl disabled:opacity-50"
        >
          {envoi ? "Création…" : "Créer le dossier"}
        </button>
      </form>
    </main>
  );
}
