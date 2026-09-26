"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RoleUtilisateur } from "@prisma/client";
import { champsObligatoiresManquantsMagasin } from "@/lib/entiteLegale";

type Magasin = {
  id: string;
  nom: string;
  ville: string | null;
  adresse: string | null;
  codePostal: string | null;
  telephone: string | null;
  email: string | null;
  siret: string | null;
  finess: string | null;
  numeroAgrementOptique: string | null;
  numeroAgrementAudio: string | null;
  responsable: string | null;
  _count: { stocks: number; utilisateurs: number };
};

type UtilisateurLeger = {
  id: string;
  nom: string;
  prenom: string | null;
  email: string;
  role: RoleUtilisateur;
  magasinId: string | null;
  actif: boolean;
  banni: boolean;
};

const LIBELLE_ROLE: Record<string, string> = {
  COLLABORATEUR: "Collaborateur",
  DIRECTEUR: "Directeur",
  SUPER_ADMIN: "Super Admin",
};

/**
 * Carte Super Admin > Magasins — même design volontairement distinct (fond
 * sombre) que le reste du Super Admin, voir SuperAdminClient.tsx.
 */
export default function MagasinsClient({
  magasins,
  utilisateurs,
}: {
  magasins: Magasin[];
  utilisateurs: UtilisateurLeger[];
}) {
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
        style={{
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(217,164,65,0.14), transparent 60%)",
        }}
      >
        <div className="mx-auto max-w-3xl">
          <Link
            href="/super-admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 px-4 py-1.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
          >
            ← Super Admin
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-white">🏬 Magasins</h1>
          <p className="mt-2 text-sm text-neutral-300">
            Créez les points de vente et affectez chaque compte à l&apos;un d&apos;eux — nécessaire au stock
            multi-magasin (fiche produit, import CSV, scan QR code).
          </p>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-8 px-6">
        <section className="rounded-2xl border border-neutral-700 bg-neutral-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Points de vente</h2>
            <button
              onClick={() => setCreation((v) => !v)}
              className="rounded-md border border-amber-400/60 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/10"
            >
              {creation ? "Annuler" : "+ Nouveau magasin"}
            </button>
          </div>

          {creation && <FormulaireMagasin onEnregistre={actualiser} onAnnuler={() => setCreation(false)} />}

          {magasins.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-300">Aucun magasin pour l&apos;instant.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {magasins.map((m) => (
                <LigneMagasin key={m.id} magasin={m} onFait={actualiser} />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-700 bg-neutral-900 p-5">
          <h2 className="text-lg font-semibold text-white">Affectation des comptes</h2>
          <p className="mt-1 text-sm text-neutral-300">
            Le magasin d&apos;un compte préremplit automatiquement les sélecteurs de magasin (création de produit,
            import CSV, scan QR code).
          </p>
          {utilisateurs.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-300">Aucun compte pour l&apos;instant.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {utilisateurs.map((u) => (
                <LigneAffectation key={u.id} utilisateur={u} magasins={magasins} onFait={actualiser} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function FormulaireMagasin({ onEnregistre, onAnnuler }: { onEnregistre: () => void; onAnnuler: () => void }) {
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer() {
    if (!nom.trim()) {
      setErreur("Le nom est requis.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch("/api/magasins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, ville }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      onEnregistre();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-neutral-700 bg-neutral-800/60 p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-neutral-200">
          Nom *
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-sm text-white placeholder:text-neutral-500"
          />
        </label>
        <label className="text-xs text-neutral-200">
          Ville
          <input
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-sm text-white placeholder:text-neutral-500"
          />
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

const CHAMP = "mt-1 w-full rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-xs text-white placeholder:text-neutral-500";

type FicheMagasin = {
  nom: string;
  ville: string;
  adresse: string;
  codePostal: string;
  telephone: string;
  email: string;
  siret: string;
  finess: string;
  numeroAgrementOptique: string;
  numeroAgrementAudio: string;
  responsable: string;
};

function versFiche(m: Magasin): FicheMagasin {
  return {
    nom: m.nom,
    ville: m.ville ?? "",
    adresse: m.adresse ?? "",
    codePostal: m.codePostal ?? "",
    telephone: m.telephone ?? "",
    email: m.email ?? "",
    siret: m.siret ?? "",
    finess: m.finess ?? "",
    numeroAgrementOptique: m.numeroAgrementOptique ?? "",
    numeroAgrementAudio: m.numeroAgrementAudio ?? "",
    responsable: m.responsable ?? "",
  };
}

function LigneMagasin({ magasin, onFait }: { magasin: Magasin; onFait: () => void }) {
  const [edition, setEdition] = useState(false);
  const [fiche, setFiche] = useState<FicheMagasin>(() => versFiche(magasin));
  const [envoi, setEnvoi] = useState(false);
  const [extraction, setExtraction] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const manquants = champsObligatoiresManquantsMagasin(versFiche(magasin));

  function set<K extends keyof FicheMagasin>(cle: K, valeur: string) {
    setFiche((f) => ({ ...f, [cle]: valeur }));
  }

  async function extraire() {
    const fichier = inputRef.current?.files?.[0];
    if (!fichier) return;
    setExtraction(true);
    setErreur(null);
    try {
      const donnees = new FormData();
      donnees.append("fichier", fichier);
      const reponse = await fetch("/api/super-admin/entite-legale/extraire", { method: "POST", body: donnees });
      const data = await reponse.json();
      if (!reponse.ok) {
        setErreur(data.erreur ?? "Échec de l'extraction.");
      } else {
        setFiche((f) => ({
          ...f,
          ...(data.adresse ? { adresse: data.adresse } : {}),
          ...(data.codePostal ? { codePostal: data.codePostal } : {}),
          ...(data.ville ? { ville: data.ville } : {}),
          ...(data.telephone ? { telephone: data.telephone } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(data.siret ? { siret: data.siret } : {}),
        }));
      }
    } catch {
      setErreur("Impossible de lire ce fichier.");
    } finally {
      setExtraction(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function enregistrer() {
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch(`/api/magasins/${magasin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fiche),
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
    if (!window.confirm(`Supprimer le magasin "${magasin.nom}" ?`)) return;
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch(`/api/magasins/${magasin.id}`, { method: "DELETE" });
    setEnvoi(false);
    if (reponse.ok) {
      onFait();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  if (edition) {
    return (
      <li className="rounded-xl border border-neutral-700 bg-neutral-800/60 p-3">
        <div className="mb-2 flex items-center gap-2">
          <input ref={inputRef} type="file" accept="image/*,.pdf" className="text-xs text-neutral-300" />
          <button
            onClick={extraire}
            disabled={extraction}
            className="rounded-md border border-amber-400/60 px-2 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
          >
            {extraction ? "Extraction…" : "Extraire depuis un document"}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="text-xs text-neutral-300">
            Nom
            <input value={fiche.nom} onChange={(e) => set("nom", e.target.value)} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Responsable
            <input value={fiche.responsable} onChange={(e) => set("responsable", e.target.value)} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            SIRET (si distinct de la société)
            <input value={fiche.siret} onChange={(e) => set("siret", e.target.value)} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300 sm:col-span-2">
            Adresse
            <input value={fiche.adresse} onChange={(e) => set("adresse", e.target.value)} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Code postal
            <input value={fiche.codePostal} onChange={(e) => set("codePostal", e.target.value)} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Ville
            <input value={fiche.ville} onChange={(e) => set("ville", e.target.value)} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Téléphone
            <input value={fiche.telephone} onChange={(e) => set("telephone", e.target.value)} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            Email
            <input value={fiche.email} onChange={(e) => set("email", e.target.value)} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            N° FINESS
            <input value={fiche.finess} onChange={(e) => set("finess", e.target.value)} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            N° agrément opticien-lunetier
            <input value={fiche.numeroAgrementOptique} onChange={(e) => set("numeroAgrementOptique", e.target.value)} className={CHAMP} />
          </label>
          <label className="text-xs text-neutral-300">
            N° agrément audioprothésiste
            <input value={fiche.numeroAgrementAudio} onChange={(e) => set("numeroAgrementAudio", e.target.value)} className={CHAMP} />
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
    <li className="rounded-xl border border-neutral-700 bg-neutral-800/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{magasin.nom}</p>
          <p className="truncate text-xs text-neutral-400">
            {magasin.ville ? `${magasin.ville} · ` : ""}
            {magasin._count.stocks} référence{magasin._count.stocks > 1 ? "s" : ""} en stock ·{" "}
            {magasin._count.utilisateurs} compte{magasin._count.utilisateurs > 1 ? "s" : ""} rattaché
            {magasin._count.utilisateurs > 1 ? "s" : ""}
          </p>
          {erreur && <p className="mt-1 text-xs text-red-400">{erreur}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setEdition(true)}
            className="rounded-md border border-neutral-600 px-2 py-1 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
          >
            Fiche complète
          </button>
          <button
            onClick={supprimer}
            disabled={envoi || magasin._count.stocks > 0 || magasin._count.utilisateurs > 0}
            title={
              magasin._count.stocks > 0 || magasin._count.utilisateurs > 0
                ? "Détachez d'abord le stock et les comptes rattachés."
                : undefined
            }
            className="rounded-md border border-red-500/50 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Supprimer
          </button>
        </div>
      </div>
      {manquants.length > 0 && (
        <p className="mt-2 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
          ⚠️ Manque : {manquants.join(", ")}
        </p>
      )}
    </li>
  );
}

function LigneAffectation({
  utilisateur,
  magasins,
  onFait,
}: {
  utilisateur: UtilisateurLeger;
  magasins: Magasin[];
  onFait: () => void;
}) {
  const [magasinId, setMagasinId] = useState(utilisateur.magasinId ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function affecter(nouveauMagasinId: string) {
    setMagasinId(nouveauMagasinId);
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch(`/api/super-admin/utilisateurs/${utilisateur.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ magasinId: nouveauMagasinId || null }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      onFait();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur.");
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-neutral-800/40 p-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">
          {utilisateur.prenom} {utilisateur.nom}
          {utilisateur.banni && <span className="ml-2 text-xs text-neutral-500">(banni)</span>}
        </p>
        <p className="truncate text-xs text-neutral-400">
          {utilisateur.email} · {LIBELLE_ROLE[utilisateur.role] ?? utilisateur.role}
        </p>
        {erreur && <p className="mt-1 text-xs text-red-400">{erreur}</p>}
      </div>
      <select
        value={magasinId}
        onChange={(e) => affecter(e.target.value)}
        disabled={envoi}
        className="shrink-0 rounded-md border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-xs text-white disabled:opacity-50"
      >
        <option value="">— Aucun —</option>
        {magasins.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nom}
          </option>
        ))}
      </select>
    </li>
  );
}
