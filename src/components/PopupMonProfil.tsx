"use client";

import { useState } from "react";

export type ProfilPerso = { prenom: string | null; telephonePerso: string | null; pseudo: string | null };

/**
 * Édition de son propre profil (nom, prénom, email perso, tél. perso,
 * pseudo, mot de passe — jamais le rôle) — partagé entre la barre du hub
 * et la page Super Admin, seul déclencheur (bouton) différent selon le thème.
 */
export default function PopupMonProfil({
  nom,
  email,
  profil,
  onFermer,
  onEnregistre,
}: {
  nom: string;
  email: string;
  profil: ProfilPerso | null;
  onFermer: () => void;
  onEnregistre: (nom: string, email: string, profil: ProfilPerso) => void;
}) {
  const [prenom, setPrenom] = useState(profil?.prenom ?? "");
  const [nomChamp, setNomChamp] = useState(nom);
  const [emailChamp, setEmailChamp] = useState(email);
  const [telephonePerso, setTelephonePerso] = useState(profil?.telephonePerso ?? "");
  const [pseudo, setPseudo] = useState(profil?.pseudo ?? "");
  const [motDePasse, setMotDePasse] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch("/api/auth/moi", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prenom,
        nom: nomChamp,
        email: emailChamp,
        telephonePerso,
        pseudo,
        ...(motDePasse ? { motDePasse } : {}),
      }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      const utilisateur = await reponse.json();
      onEnregistre(utilisateur.nom, utilisateur.email, {
        prenom: utilisateur.prenom,
        telephonePerso: utilisateur.telephonePerso,
        pseudo: utilisateur.pseudo,
      });
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onFermer}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={enregistrer}
        className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 text-left shadow-xl"
      >
        <p className="text-base font-semibold text-neutral-900">Modifier mon profil</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Prénom
            <input
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Nom
            <input
              value={nomChamp}
              onChange={(e) => setNomChamp(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Email perso
            <input
              type="email"
              value={emailChamp}
              onChange={(e) => setEmailChamp(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Téléphone perso
            <input
              value={telephonePerso}
              onChange={(e) => setTelephonePerso(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Pseudo choisi
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Nouveau mot de passe (laisser vide pour ne pas le changer)
            <input
              type="password"
              minLength={8}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onFermer} className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:underline">
            Annuler
          </button>
          <button
            type="submit"
            disabled={envoi}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
