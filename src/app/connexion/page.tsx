"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionFormulaire />
    </Suspense>
  );
}

function ConnexionFormulaire() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [amorceRequise, setAmorceRequise] = useState(false);

  useEffect(() => {
    fetch("/api/auth/moi")
      .then((r) => r.json())
      .then((data) => {
        if (data.amorceRequise) setAmorceRequise(true);
      })
      .catch(() => {});
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const reponse = await fetch("/api/auth/connexion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, motDePasse }),
    });
    setEnvoi(false);
    if (!reponse.ok) {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur de connexion.");
      return;
    }
    router.push(searchParams.get("suite") ?? "/dossiers");
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <div className="mb-6 text-center">
        <span className="text-4xl">🔐</span>
        <h1 className="mt-2 text-2xl font-extrabold text-neutral-900">Connexion</h1>
        <p className="mt-1 text-sm text-neutral-500">Accès réservé à l&apos;équipe.</p>
      </div>

      {amorceRequise && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Aucun compte n&apos;existe encore.{" "}
          <Link href="/premiere-connexion" className="font-semibold underline">
            Créer le premier compte (admin)
          </Link>
          .
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 rounded-[28px] border border-neutral-200 bg-white p-6 shadow-lg">
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
          Mot de passe
          <input
            type="password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>

        {erreur && <p className="text-sm text-red-600">{erreur}</p>}

        <button
          type="submit"
          disabled={envoi}
          className="w-full rounded-full bg-gradient-to-r from-orange-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50"
        >
          {envoi ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
