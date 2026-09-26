"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Mutuelle, CaisseAmo } from "@prisma/client";

const CHAMP = "mt-1 w-full rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-xs text-white placeholder:text-neutral-500";

export default function MutuellesClient({ mutuelles, caisses }: { mutuelles: Mutuelle[]; caisses: CaisseAmo[] }) {
  const router = useRouter();
  const [creationMutuelle, setCreationMutuelle] = useState(false);
  const [creationCaisse, setCreationCaisse] = useState(false);

  function actualiser() {
    router.refresh();
    setCreationMutuelle(false);
    setCreationCaisse(false);
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
          <h1 className="mt-4 text-2xl font-semibold text-white">🤝 Mutuelles & sécurité sociale</h1>
          <p className="mt-2 text-sm text-neutral-300">
            Annuaire des mutuelles (AMC) — avec leurs accès portail, pour automatiser les demandes de prise en
            charge et de paiement — et des caisses de sécurité sociale (AMO). Un dossier client peut avoir une
            mutuelle principale et une secondaire/surcomplémentaire, qui fonctionnent à l&apos;identique.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-8 px-6">
        <section className="rounded-2xl border border-neutral-700 bg-neutral-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Mutuelles (AMC)</h2>
            <button
              onClick={() => setCreationMutuelle((v) => !v)}
              className="rounded-md border border-amber-400/60 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/10"
            >
              {creationMutuelle ? "Annuler" : "+ Nouvelle mutuelle"}
            </button>
          </div>
          {creationMutuelle && <FormulaireMutuelle onFait={actualiser} onAnnuler={() => setCreationMutuelle(false)} />}
          {mutuelles.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-300">Aucune mutuelle pour l&apos;instant.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {mutuelles.map((m) => (
                <LigneMutuelle key={m.id} mutuelle={m} onFait={actualiser} />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-700 bg-neutral-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Sécurité sociale (AMO)</h2>
            <button
              onClick={() => setCreationCaisse((v) => !v)}
              className="rounded-md border border-amber-400/60 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/10"
            >
              {creationCaisse ? "Annuler" : "+ Nouvelle caisse"}
            </button>
          </div>
          {creationCaisse && <FormulaireCaisse onFait={actualiser} onAnnuler={() => setCreationCaisse(false)} />}
          {caisses.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-300">Aucune caisse pour l&apos;instant.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {caisses.map((c) => (
                <LigneCaisse key={c.id} caisse={c} onFait={actualiser} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function FormulaireMutuelle({ onFait, onAnnuler }: { onFait: () => void; onAnnuler: () => void }) {
  const [champs, setChamps] = useState({
    nom: "",
    plateforme: "",
    identifiantAcces: "",
    motDePasseAcces: "",
    urlPortail: "",
    telephone: "",
    email: "",
    remarques: "",
  });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer() {
    if (!champs.nom.trim()) {
      setErreur("Le nom est requis.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch("/api/super-admin/mutuelles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(champs),
    });
    setEnvoi(false);
    if (reponse.ok) onFait();
    else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-neutral-700 bg-neutral-800/60 p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-neutral-200">
          Nom *
          <input value={champs.nom} onChange={(e) => setChamps({ ...champs, nom: e.target.value })} className={CHAMP} />
        </label>
        <label className="text-xs text-neutral-200">
          Plateforme (Viamédis, Almerys…)
          <input value={champs.plateforme} onChange={(e) => setChamps({ ...champs, plateforme: e.target.value })} className={CHAMP} />
        </label>
        <label className="text-xs text-neutral-200">
          Identifiant d&apos;accès portail
          <input value={champs.identifiantAcces} onChange={(e) => setChamps({ ...champs, identifiantAcces: e.target.value })} className={CHAMP} />
        </label>
        <label className="text-xs text-neutral-200">
          Mot de passe d&apos;accès
          <input
            type="password"
            value={champs.motDePasseAcces}
            onChange={(e) => setChamps({ ...champs, motDePasseAcces: e.target.value })}
            className={CHAMP}
          />
        </label>
        <label className="text-xs text-neutral-200 sm:col-span-2">
          URL du portail
          <input value={champs.urlPortail} onChange={(e) => setChamps({ ...champs, urlPortail: e.target.value })} className={CHAMP} />
        </label>
        <label className="text-xs text-neutral-200">
          Téléphone
          <input value={champs.telephone} onChange={(e) => setChamps({ ...champs, telephone: e.target.value })} className={CHAMP} />
        </label>
        <label className="text-xs text-neutral-200">
          Email
          <input value={champs.email} onChange={(e) => setChamps({ ...champs, email: e.target.value })} className={CHAMP} />
        </label>
        <label className="text-xs text-neutral-200 sm:col-span-2">
          Remarques
          <input value={champs.remarques} onChange={(e) => setChamps({ ...champs, remarques: e.target.value })} className={CHAMP} />
        </label>
      </div>
      <p className="text-[11px] text-amber-300/80">
        ⚠️ Ces identifiants sont stockés tels quels (non chiffrés) — voir la note du modèle Mutuelle. À ne renseigner
        que si l&apos;hébergement de ce déploiement le permet.
      </p>
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

function LigneMutuelle({ mutuelle, onFait }: { mutuelle: Mutuelle; onFait: () => void }) {
  const [edition, setEdition] = useState(false);
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [champs, setChamps] = useState({
    nom: mutuelle.nom,
    plateforme: mutuelle.plateforme ?? "",
    identifiantAcces: mutuelle.identifiantAcces ?? "",
    motDePasseAcces: mutuelle.motDePasseAcces ?? "",
    urlPortail: mutuelle.urlPortail ?? "",
    telephone: mutuelle.telephone ?? "",
    email: mutuelle.email ?? "",
    remarques: mutuelle.remarques ?? "",
  });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer() {
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch(`/api/super-admin/mutuelles/${mutuelle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(champs),
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
    await fetch(`/api/super-admin/mutuelles/${mutuelle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !mutuelle.actif }),
    });
    onFait();
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer la mutuelle "${mutuelle.nom}" ?`)) return;
    setEnvoi(true);
    const reponse = await fetch(`/api/super-admin/mutuelles/${mutuelle.id}`, { method: "DELETE" });
    setEnvoi(false);
    if (reponse.ok) onFait();
  }

  if (edition) {
    return (
      <li className="rounded-xl border border-neutral-700 bg-neutral-800/60 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-neutral-300">
            Nom
            <input value={champs.nom} onChange={(e) => setChamps({ ...champs, nom: e.target.value })} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Plateforme
            <input value={champs.plateforme} onChange={(e) => setChamps({ ...champs, plateforme: e.target.value })} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Identifiant d&apos;accès
            <input value={champs.identifiantAcces} onChange={(e) => setChamps({ ...champs, identifiantAcces: e.target.value })} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Mot de passe d&apos;accès
            <input
              type={afficherMdp ? "text" : "password"}
              value={champs.motDePasseAcces}
              onChange={(e) => setChamps({ ...champs, motDePasseAcces: e.target.value })}
              className={CHAMP}
            />
          </label>
          <label className="text-xs text-neutral-300 sm:col-span-2">
            URL du portail
            <input value={champs.urlPortail} onChange={(e) => setChamps({ ...champs, urlPortail: e.target.value })} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Téléphone
            <input value={champs.telephone} onChange={(e) => setChamps({ ...champs, telephone: e.target.value })} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Email
            <input value={champs.email} onChange={(e) => setChamps({ ...champs, email: e.target.value })} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300 sm:col-span-2">
            Remarques
            <input value={champs.remarques} onChange={(e) => setChamps({ ...champs, remarques: e.target.value })} className={CHAMP} />
          </label>
        </div>
        <button onClick={() => setAfficherMdp((v) => !v)} className="mt-1 text-[11px] text-neutral-400 hover:underline">
          {afficherMdp ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        </button>
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
          {mutuelle.nom}
          {!mutuelle.actif && <span className="ml-2 text-xs text-neutral-500">(inactive)</span>}
        </p>
        <p className="truncate text-xs text-neutral-400">
          {mutuelle.plateforme || "—"} {mutuelle.identifiantAcces ? `· accès configuré` : "· pas d'accès configuré"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button onClick={basculerActif} className="rounded-md border border-neutral-600 px-2 py-1 text-xs font-medium text-neutral-200 hover:bg-neutral-800">
          {mutuelle.actif ? "Désactiver" : "Activer"}
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

function FormulaireCaisse({ onFait, onAnnuler }: { onFait: () => void; onAnnuler: () => void }) {
  const [champs, setChamps] = useState({ nom: "", codeCaisse: "", telephone: "", email: "", adresse: "" });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer() {
    if (!champs.nom.trim()) {
      setErreur("Le nom est requis.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch("/api/super-admin/caisses-amo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(champs),
    });
    setEnvoi(false);
    if (reponse.ok) onFait();
    else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-neutral-700 bg-neutral-800/60 p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-neutral-200">
          Nom * (ex. CPAM de Paris)
          <input value={champs.nom} onChange={(e) => setChamps({ ...champs, nom: e.target.value })} className={CHAMP} />
        </label>
        <label className="text-xs text-neutral-200">
          Code caisse
          <input value={champs.codeCaisse} onChange={(e) => setChamps({ ...champs, codeCaisse: e.target.value })} className={CHAMP} />
        </label>
        <label className="text-xs text-neutral-200">
          Téléphone
          <input value={champs.telephone} onChange={(e) => setChamps({ ...champs, telephone: e.target.value })} className={CHAMP} />
        </label>
        <label className="text-xs text-neutral-200">
          Email
          <input value={champs.email} onChange={(e) => setChamps({ ...champs, email: e.target.value })} className={CHAMP} />
        </label>
        <label className="text-xs text-neutral-200 sm:col-span-2">
          Adresse
          <input value={champs.adresse} onChange={(e) => setChamps({ ...champs, adresse: e.target.value })} className={CHAMP} />
        </label>
      </div>
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

function LigneCaisse({ caisse, onFait }: { caisse: CaisseAmo; onFait: () => void }) {
  const [edition, setEdition] = useState(false);
  const [champs, setChamps] = useState({
    nom: caisse.nom,
    codeCaisse: caisse.codeCaisse ?? "",
    telephone: caisse.telephone ?? "",
    email: caisse.email ?? "",
    adresse: caisse.adresse ?? "",
  });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer() {
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch(`/api/super-admin/caisses-amo/${caisse.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(champs),
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

  async function supprimer() {
    if (!window.confirm(`Supprimer la caisse "${caisse.nom}" ?`)) return;
    setEnvoi(true);
    const reponse = await fetch(`/api/super-admin/caisses-amo/${caisse.id}`, { method: "DELETE" });
    setEnvoi(false);
    if (reponse.ok) onFait();
  }

  if (edition) {
    return (
      <li className="rounded-xl border border-neutral-700 bg-neutral-800/60 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-neutral-300">
            Nom
            <input value={champs.nom} onChange={(e) => setChamps({ ...champs, nom: e.target.value })} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Code caisse
            <input value={champs.codeCaisse} onChange={(e) => setChamps({ ...champs, codeCaisse: e.target.value })} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Téléphone
            <input value={champs.telephone} onChange={(e) => setChamps({ ...champs, telephone: e.target.value })} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Email
            <input value={champs.email} onChange={(e) => setChamps({ ...champs, email: e.target.value })} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300 sm:col-span-2">
            Adresse
            <input value={champs.adresse} onChange={(e) => setChamps({ ...champs, adresse: e.target.value })} className={CHAMP} />
          </label>
        </div>
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
        <p className="truncate font-medium text-white">{caisse.nom}</p>
        <p className="truncate text-xs text-neutral-400">{caisse.codeCaisse || "—"}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
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
