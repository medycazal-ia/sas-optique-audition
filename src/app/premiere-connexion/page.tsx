"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PremiereConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const reponse = await fetch("/api/auth/amorcer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nom, motDePasse }),
    });
    setEnvoi(false);
    if (!reponse.ok) {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
      return;
    }
    router.push("/dossiers");
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <div className="mb-6 text-center">
        <span className="text-4xl">🛠️</span>
        <h1 className="mt-2 text-2xl font-extrabold text-neutral-900">Premier compte</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Ce compte sera directeur (accès à toutes les fonctions). Cette page ne fonctionne qu&apos;une seule fois — tant
          qu&apos;aucun compte n&apos;existe.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-[28px] border border-neutral-200 bg-white p-6 shadow-lg">
        <label className="block text-sm">
          Nom
          <input
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          Mot de passe (8 caractères minimum)
          <input
            type="password"
            required
            minLength={8}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>

        {erreur && <p className="text-sm text-red-600">{erreur}</p>}

        <button
          type="submit"
          disabled={envoi}
          className="w-full rounded-full bg-neutral-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50"
        >
          {envoi ? "Création…" : "Créer le compte directeur"}
        </button>
      </form>
    </main>
  );
}
