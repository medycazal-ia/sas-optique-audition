"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BarreUtilisateur() {
  const router = useRouter();
  const [nom, setNom] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/moi")
      .then((r) => r.json())
      .then((data) => setNom(data.session?.nom ?? null))
      .catch(() => {});
  }, []);

  async function deconnexion() {
    await fetch("/api/auth/deconnexion", { method: "POST" });
    router.push("/connexion");
    router.refresh();
  }

  if (!nom) return null;

  return (
    <div className="flex items-center gap-3 text-sm text-neutral-500">
      <span>
        Connecté·e : <span className="font-medium text-neutral-700">{nom}</span>
      </span>
      <button onClick={deconnexion} className="text-neutral-400 underline hover:text-neutral-600">
        Se déconnecter
      </button>
    </div>
  );
}
