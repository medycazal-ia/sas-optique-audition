"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMonProfil } from "@/lib/monProfil";
import PopupMonProfil from "@/components/PopupMonProfil";

export default function BarreUtilisateur() {
  const router = useRouter();
  const { nom, email, profil, setNom, setEmail, setProfil } = useMonProfil();
  const [edition, setEdition] = useState(false);

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
      <button onClick={() => setEdition(true)} className="text-neutral-400 underline hover:text-neutral-600">
        Modifier mon profil
      </button>
      <button onClick={deconnexion} className="text-neutral-400 underline hover:text-neutral-600">
        Se déconnecter
      </button>

      {edition && (
        <PopupMonProfil
          nom={nom}
          email={email}
          profil={profil}
          onFermer={() => setEdition(false)}
          onEnregistre={(nouveauNom, nouvelEmail, nouveauProfil) => {
            setNom(nouveauNom);
            setEmail(nouvelEmail);
            setProfil(nouveauProfil);
            setEdition(false);
          }}
        />
      )}
    </div>
  );
}
