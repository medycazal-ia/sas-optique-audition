"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Utilisateur } from "@prisma/client";

type UtilisateurSansHash = Omit<Utilisateur, "motDePasseHash">;

const LIBELLE_ROLE: Record<string, string> = {
  COLLABORATEUR: "Collaborateur",
  DIRECTEUR: "Directeur",
};

export default function UtilisateursClient({
  utilisateursInitiaux,
  sessionId,
}: {
  utilisateursInitiaux: UtilisateurSansHash[];
  sessionId: string;
}) {
  const router = useRouter();
  const [creation, setCreation] = useState(false);
  const [popup, setPopup] = useState<{ prenom: string; actif: boolean } | null>(null);
  const [demoEnCours, setDemoEnCours] = useState(false);
  const [demoResultat, setDemoResultat] = useState<{
    identifiants: {
      directeur: { email: string; motDePasse: string };
      collaborateur: { email: string; motDePasse: string };
    };
    dossiersCrees: string[];
  } | null>(null);

  function actualiser() {
    router.refresh();
  }

  async function amorcerDemo() {
    setDemoEnCours(true);
    const reponse = await fetch("/api/utilisateurs/demo", { method: "POST" });
    setDemoEnCours(false);
    if (reponse.ok) {
      setDemoResultat(await reponse.json());
      actualiser();
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setCreation((v) => !v)}
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-neutral-700"
        >
          {creation ? "Annuler" : "+ Nouvel utilisateur"}
        </button>
        <button
          onClick={amorcerDemo}
          disabled={demoEnCours}
          className="rounded-full border-2 border-fuchsia-400 px-5 py-2.5 text-sm font-semibold text-fuchsia-600 transition hover:scale-105 hover:bg-fuchsia-50 disabled:opacity-50"
        >
          {demoEnCours ? "…" : "🎬 Créer les comptes démo"}
        </button>
      </div>

      {demoResultat && (
        <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-900">
          <p className="font-semibold">Comptes démo prêts :</p>
          <p className="mt-1">
            Directeur — {demoResultat.identifiants.directeur.email} / {demoResultat.identifiants.directeur.motDePasse}
          </p>
          <p>
            Collaborateur — {demoResultat.identifiants.collaborateur.email} /{" "}
            {demoResultat.identifiants.collaborateur.motDePasse}
          </p>
          {demoResultat.dossiersCrees.length > 0 && (
            <p className="mt-1 text-xs text-fuchsia-700">Dossiers d&apos;exemple ajoutés : {demoResultat.dossiersCrees.join(", ")}</p>
          )}
        </div>
      )}

      {creation && (
        <FormulaireCreation
          apiBase="/api/utilisateurs"
          onCree={() => {
            setCreation(false);
            actualiser();
          }}
        />
      )}

      <ul className="space-y-3">
        {utilisateursInitiaux.map((u) => (
          <LigneUtilisateur
            key={u.id}
            utilisateur={u}
            estMoi={u.id === sessionId}
            apiBase="/api/utilisateurs"
            onFait={actualiser}
            onStatut={(prenom, actif) => setPopup({ prenom, actif })}
          />
        ))}
      </ul>

      {utilisateursInitiaux.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-neutral-300 bg-white/60 p-10 text-center text-neutral-500">
          Aucun utilisateur pour l&apos;instant.
        </p>
      )}

      {popup && <PopupStatutCompte prenom={popup.prenom} actif={popup.actif} onFermer={() => setPopup(null)} />}
    </div>
  );
}

export function FormulaireCreation({
  apiBase,
  onCree,
  rolesDisponibles = ["COLLABORATEUR", "DIRECTEUR"],
}: {
  apiBase: string;
  onCree: () => void;
  rolesDisponibles?: string[];
}) {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephonePerso, setTelephonePerso] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [role, setRole] = useState(rolesDisponibles[0]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, prenom, email, telephonePerso, pseudo, motDePasse, role }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      onCree();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  return (
    <form onSubmit={creer} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Prénom *
          <input
            required
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Nom *
          <input
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Email perso *
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
        <label className="text-sm">
          Mot de passe choisi * (8 car. min.)
          <input
            type="password"
            required
            minLength={8}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Rôle
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {rolesDisponibles.map((r) => (
              <option key={r} value={r}>
                {LIBELLE_ROLE[r] ?? r}
              </option>
            ))}
          </select>
        </label>
      </div>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      <button
        type="submit"
        disabled={envoi}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {envoi ? "Création…" : "Créer le compte"}
      </button>
    </form>
  );
}

export function LigneUtilisateur({
  utilisateur,
  estMoi,
  apiBase,
  onFait,
  onStatut,
  badgeRole,
}: {
  utilisateur: UtilisateurSansHash;
  estMoi: boolean;
  apiBase: string;
  onFait: () => void;
  onStatut: (prenom: string, actif: boolean) => void;
  badgeRole?: React.ReactNode;
}) {
  const [edition, setEdition] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [motifBan, setMotifBan] = useState("");
  const [banEnCours, setBanEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const prenomAffiche = utilisateur.prenom || utilisateur.nom;

  async function basculerActif() {
    setEnvoi(true);
    setErreur(null);
    const nouvelActif = !utilisateur.actif;
    const reponse = await fetch(`${apiBase}/${utilisateur.id}/actif`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: nouvelActif }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      onStatut(prenomAffiche, nouvelActif);
      onFait();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  async function bannir() {
    if (!motifBan.trim()) {
      setErreur("Un motif est requis.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch(`${apiBase}/${utilisateur.id}/bannir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motif: motifBan }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      setBanEnCours(false);
      onFait();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-semibold text-neutral-900">
            {utilisateur.prenom} {utilisateur.nom}
            {badgeRole}
            {estMoi && <span className="text-xs font-normal text-neutral-400">(vous)</span>}
          </p>
          <p className="truncate text-sm text-neutral-500">
            {utilisateur.email} · {LIBELLE_ROLE[utilisateur.role] ?? utilisateur.role}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {utilisateur.banni ? (
            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-semibold text-white">Banni</span>
          ) : (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                utilisateur.actif ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {utilisateur.actif ? "Actif" : "Inactif"}
            </span>
          )}
          <button onClick={() => setEdition((v) => !v)} className="text-xs text-neutral-500 hover:underline">
            {edition ? "Fermer" : "Détails"}
          </button>
        </div>
      </div>

      {edition && (
        <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3 text-sm">
          <p className="text-neutral-500">
            Téléphone perso : {utilisateur.telephonePerso || "—"} · Pseudo : {utilisateur.pseudo || "—"}
          </p>
          {utilisateur.banni && (
            <p className="rounded-md bg-neutral-50 p-2 text-xs text-neutral-600">
              Banni le {utilisateur.banniA ? new Date(utilisateur.banniA).toLocaleDateString("fr-FR") : "—"} par{" "}
              {utilisateur.banniPar ?? "—"} — motif : {utilisateur.banniMotif ?? "—"}
            </p>
          )}

          {!utilisateur.banni && !estMoi && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={basculerActif}
                disabled={envoi}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {utilisateur.actif ? "Désactiver" : "Réactiver"}
              </button>
              {!banEnCours ? (
                <button
                  onClick={() => setBanEnCours(true)}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Bannir…
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={motifBan}
                    onChange={(e) => setMotifBan(e.target.value)}
                    placeholder="Motif du bannissement"
                    className="w-48 rounded-md border border-neutral-300 px-2 py-1 text-xs"
                  />
                  <button
                    onClick={bannir}
                    disabled={envoi}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirmer le bannissement
                  </button>
                  <button onClick={() => setBanEnCours(false)} className="text-xs text-neutral-500 hover:underline">
                    Annuler
                  </button>
                </div>
              )}
            </div>
          )}
          {erreur && <p className="text-xs text-red-600">{erreur}</p>}
          <p className="pt-1 text-xs text-amber-700">
            ⚠️ Un bannissement est définitif — le compte ne peut plus jamais être réactivé.
          </p>
        </div>
      )}
    </li>
  );
}

export function PopupStatutCompte({
  prenom,
  actif,
  onFermer,
}: {
  prenom: string;
  actif: boolean;
  onFermer: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onFermer}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl">
        <span className="text-4xl">{actif ? "✅" : "⏸️"}</span>
        <p className="mt-3 text-base font-semibold text-neutral-900">
          {prenom}, ton compte est {actif ? "actif" : "inactif"}.
        </p>
        <p className="mt-1 text-xs text-neutral-400">Notification vocale à venir.</p>
        <button
          onClick={onFermer}
          className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
