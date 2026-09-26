"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BoiteMailTiersPayant } from "@prisma/client";

const CHAMP = "mt-1 w-full rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-xs text-white placeholder:text-neutral-500";

type Champs = { nom: string; email: string; plateformes: string; makeScenarioId: string; remarques: string };

function versChamps(b: BoiteMailTiersPayant): Champs {
  return {
    nom: b.nom,
    email: b.email,
    plateformes: b.plateformes.join(", "),
    makeScenarioId: b.makeScenarioId?.toString() ?? "",
    remarques: b.remarques ?? "",
  };
}

function versPayload(champs: Champs) {
  return {
    nom: champs.nom.trim(),
    email: champs.email.trim(),
    plateformes: champs.plateformes
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
    makeScenarioId: champs.makeScenarioId.trim() || null,
    remarques: champs.remarques.trim() || null,
  };
}

export default function BoitesMailClient({ boites }: { boites: BoiteMailTiersPayant[] }) {
  const router = useRouter();
  const [creation, setCreation] = useState(false);

  function actualiser() {
    router.refresh();
    setCreation(false);
  }

  return (
    <div className="min-h-screen bg-neutral-950 pb-24 text-neutral-100">
      <div
        className="border-b border-amber-500/20 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 px-6 py-10"
        style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(217,164,65,0.14), transparent 60%)" }}
      >
        <div className="mx-auto max-w-3xl">
          <Link
            href="/super-admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 px-4 py-1.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
          >
            ← Super Admin
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-white">📬 Boîtes mail tiers payant</h1>
          <p className="mt-2 text-sm text-neutral-300">
            Boîtes mail surveillées pour retrouver automatiquement, une fois par jour, les accords et refus de prise
            en charge reçus par mail (numéro d&apos;accord, document, ou les deux) et les rattacher au bon dossier.
          </p>
          <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
            ⚠️ Cette page ne connecte pas la boîte mail elle-même : la connexion réelle (Gmail, Microsoft 365…) se
            configure dans Make (make.com), qui envoie ensuite chaque mail pertinent à ce logiciel. Chaque ligne
            ci-dessous documente une boîte déjà connectée dans Make, et son numéro de scénario Make (pour la relance
            manuelle depuis un dossier) — plusieurs boîtes peuvent être renseignées si l&apos;opticien en utilise
            plusieurs.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-4 px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Boîtes enregistrées</h2>
          <button
            onClick={() => setCreation((v) => !v)}
            className="rounded-md border border-amber-400/60 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/10"
          >
            {creation ? "Annuler" : "+ Nouvelle boîte mail"}
          </button>
        </div>
        {creation && <Formulaire onFait={actualiser} onAnnuler={() => setCreation(false)} />}
        {boites.length === 0 ? (
          <p className="text-sm text-neutral-300">Aucune boîte mail enregistrée pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-2">
            {boites.map((b) => (
              <Ligne key={b.id} boite={b} onFait={actualiser} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChampsFormulaire({ champs, onChange }: { champs: Champs; onChange: (c: Champs) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-xs text-neutral-200">
        Nom * (ex. Boîte Gmail principale)
        <input value={champs.nom} onChange={(e) => onChange({ ...champs, nom: e.target.value })} className={CHAMP} />
      </label>
      <label className="text-xs text-neutral-200">
        Adresse mail *
        <input value={champs.email} onChange={(e) => onChange({ ...champs, email: e.target.value })} className={CHAMP} />
      </label>
      <label className="text-xs text-neutral-200 sm:col-span-2">
        Plateformes/mutuelles couvertes (séparées par des virgules — vide = boîte par défaut, pour tout le reste)
        <input
          value={champs.plateformes}
          onChange={(e) => onChange({ ...champs, plateformes: e.target.value })}
          placeholder="ex. Viamédis, Almerys"
          className={CHAMP}
        />
      </label>
      <label className="text-xs text-neutral-200">
        N° du scénario Make associé
        <input
          value={champs.makeScenarioId}
          onChange={(e) => onChange({ ...champs, makeScenarioId: e.target.value })}
          placeholder="voir l'URL du scénario dans Make"
          className={CHAMP}
        />
      </label>
      <label className="text-xs text-neutral-200 sm:col-span-2">
        Remarques
        <input value={champs.remarques} onChange={(e) => onChange({ ...champs, remarques: e.target.value })} className={CHAMP} />
      </label>
    </div>
  );
}

function Formulaire({ onFait, onAnnuler }: { onFait: () => void; onAnnuler: () => void }) {
  const [champs, setChamps] = useState<Champs>({ nom: "", email: "", plateformes: "", makeScenarioId: "", remarques: "" });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer() {
    if (!champs.nom.trim() || !champs.email.trim()) {
      setErreur("Le nom et l'adresse mail sont requis.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch("/api/super-admin/boites-mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(versPayload(champs)),
    });
    setEnvoi(false);
    if (reponse.ok) onFait();
    else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-neutral-700 bg-neutral-800/60 p-4">
      <ChampsFormulaire champs={champs} onChange={setChamps} />
      {erreur && <p className="text-xs text-red-400">{erreur}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={creer}
          disabled={envoi}
          className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {envoi ? "Création…" : "Créer"}
        </button>
        <button onClick={onAnnuler} className="text-xs text-neutral-400 hover:underline">
          Annuler
        </button>
      </div>
    </div>
  );
}

function Ligne({ boite, onFait }: { boite: BoiteMailTiersPayant; onFait: () => void }) {
  const [edition, setEdition] = useState(false);
  const [champs, setChamps] = useState<Champs>(versChamps(boite));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer() {
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch(`/api/super-admin/boites-mail/${boite.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(versPayload(champs)),
    });
    setEnvoi(false);
    if (reponse.ok) {
      setEdition(false);
      onFait();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  async function basculerActif() {
    setEnvoi(true);
    await fetch(`/api/super-admin/boites-mail/${boite.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !boite.actif }),
    });
    setEnvoi(false);
    onFait();
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer la boîte mail "${boite.nom}" ?`)) return;
    setEnvoi(true);
    const reponse = await fetch(`/api/super-admin/boites-mail/${boite.id}`, { method: "DELETE" });
    setEnvoi(false);
    if (reponse.ok) onFait();
  }

  if (edition) {
    return (
      <li className="rounded-xl border border-neutral-700 bg-neutral-800/60 p-3">
        <ChampsFormulaire champs={champs} onChange={setChamps} />
        {erreur && <p className="mt-2 text-xs text-red-400">{erreur}</p>}
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={enregistrer}
            disabled={envoi}
            className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
          >
            Enregistrer
          </button>
          <button onClick={() => setEdition(false)} className="text-xs text-neutral-400 hover:underline">
            Annuler
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-neutral-800/40 p-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">
          {boite.nom} {!boite.actif && <span className="text-neutral-500">(inactive)</span>}
        </p>
        <p className="truncate text-xs text-neutral-400">
          {boite.email} · {boite.plateformes.length > 0 ? boite.plateformes.join(", ") : "boîte par défaut"}
          {boite.makeScenarioId ? ` · scénario Make #${boite.makeScenarioId}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={basculerActif}
          disabled={envoi}
          className="rounded-md border border-neutral-600 px-2 py-1 text-xs font-medium text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
        >
          {boite.actif ? "Désactiver" : "Activer"}
        </button>
        <button onClick={() => setEdition(true)} className="rounded-md border border-neutral-600 px-2 py-1 text-xs font-medium text-neutral-200 hover:bg-neutral-800">
          Modifier
        </button>
        <button onClick={supprimer} className="rounded-md border border-red-500/50 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-500/10">
          Supprimer
        </button>
      </div>
    </li>
  );
}
