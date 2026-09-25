"use client";

import { useEffect, useState } from "react";
import type { ProfilPerso } from "@/components/PopupMonProfil";

/** Charge nom/email/profil de son propre compte — partagé entre tous les endroits proposant "Modifier mon profil". */
export function useMonProfil() {
  const [nom, setNom] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profil, setProfil] = useState<ProfilPerso | null>(null);

  useEffect(() => {
    fetch("/api/auth/moi")
      .then((r) => r.json())
      .then((data) => {
        setNom(data.session?.nom ?? null);
        setEmail(data.session?.email ?? "");
        setProfil(data.profil ?? null);
      })
      .catch(() => {});
  }, []);

  return { nom, email, profil, setNom, setEmail, setProfil };
}
