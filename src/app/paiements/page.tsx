"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Saisie manuelle d'un code paiement, pour l'appareil qui n'a pas pu
 * scanner le QR (voir /paiements/[code]).
 */
export default function PaiementsPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function ouvrir(e: React.FormEvent) {
    e.preventDefault();
    const valeur = code.trim();
    if (valeur) router.push(`/paiements/${valeur}`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Accueil
      </Link>
      <div className="mt-6 rounded-[28px] border border-neutral-200 bg-white p-6 shadow-lg">
        <h1 className="text-lg font-extrabold text-neutral-900">Saisir un code paiement</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Si vous ne pouvez pas scanner le QR, saisissez le code imprimé sur le document.
        </p>
        <form onSubmit={ouvrir} className="mt-4 flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code paiement"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700">
            Ouvrir
          </button>
        </form>
      </div>
    </main>
  );
}
