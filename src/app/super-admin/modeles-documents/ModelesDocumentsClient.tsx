"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ModeleDocument, TypeModeleDocument } from "@prisma/client";

const TYPES: { valeur: TypeModeleDocument; libelle: string; emoji: string }[] = [
  { valeur: "FACTURE", libelle: "Facture", emoji: "🧾" },
  { valeur: "DEVIS_NORMALISE", libelle: "Devis normalisé (100% Santé)", emoji: "📋" },
  { valeur: "DEVIS_NON_NORMALISE", libelle: "Devis non normalisé", emoji: "📄" },
  { valeur: "ACCORD_TIERS_PAYANT", libelle: "Accord tiers payant", emoji: "🤝" },
];

/**
 * Carte Super Admin > Modèles de documents — même design volontairement
 * distinct (fond sombre) que le reste du Super Admin, voir
 * src/app/super-admin/SuperAdminClient.tsx.
 */
export default function ModelesDocumentsClient({ modeles }: { modeles: ModeleDocument[] }) {
  const router = useRouter();
  const [typeEnCreation, setTypeEnCreation] = useState<TypeModeleDocument | null>(null);
  const [modeleEnEdition, setModeleEnEdition] = useState<ModeleDocument | null>(null);

  function actualiser() {
    router.refresh();
    setTypeEnCreation(null);
    setModeleEnEdition(null);
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
          <Link href="/super-admin" className="text-sm text-neutral-500 underline hover:text-neutral-300">
            ← Super Admin
          </Link>
          <h1 className="mt-4 text-2xl font-semibold">📄 Modèles de documents</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Configurez l&apos;en-tête, le texte d&apos;introduction et le pied de page de chaque type de document.
            Enregistrez plusieurs modèles par type et basculez entre eux à tout moment — les autres restent
            conservés, réactivables plus tard.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-8 px-6">
        {TYPES.map(({ valeur, libelle, emoji }) => {
          const modelesDuType = modeles.filter((m) => m.type === valeur);
          return (
            <section key={valeur} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {emoji} {libelle}
                </h2>
                <button
                  onClick={() => setTypeEnCreation(valeur)}
                  className="rounded-md border border-amber-500/40 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/10"
                >
                  + Nouveau modèle
                </button>
              </div>

              {modelesDuType.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-500">
                  Aucun modèle configuré — les documents de ce type utilisent une mise en page sobre par défaut.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {modelesDuType.map((m) => (
                    <LigneModele key={m.id} modele={m} onFait={actualiser} onModifier={() => setModeleEnEdition(m)} />
                  ))}
                </ul>
              )}

              {valeur === "DEVIS_NORMALISE" && (
                <p className="mt-3 text-xs text-amber-500/80">
                  ⚠️ Structure indicative (offre 100% Santé / marché libre) — à faire valider par un expert
                  métier/juridique avant tout usage réel avec des clients.
                </p>
              )}
            </section>
          );
        })}
      </div>

      {(typeEnCreation || modeleEnEdition) && (
        <FormulaireModele
          type={typeEnCreation ?? modeleEnEdition!.type}
          modele={modeleEnEdition}
          onFermer={() => {
            setTypeEnCreation(null);
            setModeleEnEdition(null);
          }}
          onFait={actualiser}
        />
      )}
    </div>
  );
}

function LigneModele({
  modele,
  onFait,
  onModifier,
}: {
  modele: ModeleDocument;
  onFait: () => void;
  onModifier: () => void;
}) {
  const [envoi, setEnvoi] = useState(false);

  async function activer() {
    setEnvoi(true);
    await fetch(`/api/super-admin/modeles-documents/${modele.id}/activer`, { method: "POST" });
    setEnvoi(false);
    onFait();
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer le modèle « ${modele.nom} » ?`)) return;
    setEnvoi(true);
    await fetch(`/api/super-admin/modeles-documents/${modele.id}`, { method: "DELETE" });
    setEnvoi(false);
    onFait();
  }

  return (
    <li className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-100">{modele.nom}</span>
        {modele.actif && (
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">Actif</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {!modele.actif && (
          <button onClick={activer} disabled={envoi} className="text-xs font-medium text-amber-400 hover:underline disabled:opacity-50">
            Activer
          </button>
        )}
        <button onClick={onModifier} className="text-xs text-neutral-400 hover:underline">
          Modifier
        </button>
        <button onClick={supprimer} disabled={envoi} className="text-xs text-red-400 hover:underline disabled:opacity-50">
          Supprimer
        </button>
      </div>
    </li>
  );
}

function FormulaireModele({
  type,
  modele,
  onFermer,
  onFait,
}: {
  type: TypeModeleDocument;
  modele: ModeleDocument | null;
  onFermer: () => void;
  onFait: () => void;
}) {
  const [nom, setNom] = useState(modele?.nom ?? "");
  const [enteteNom, setEnteteNom] = useState(modele?.enteteNom ?? "");
  const [enteteAdresse, setEnteteAdresse] = useState(modele?.enteteAdresse ?? "");
  const [enteteSiret, setEnteteSiret] = useState(modele?.enteteSiret ?? "");
  const [enteteTelephone, setEnteteTelephone] = useState(modele?.enteteTelephone ?? "");
  const [enteteEmail, setEnteteEmail] = useState(modele?.enteteEmail ?? "");
  const [texteIntro, setTexteIntro] = useState(modele?.texteIntro ?? "");
  const [piedDePage, setPiedDePage] = useState(modele?.piedDePage ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer() {
    if (!nom.trim()) {
      setErreur("Le nom du modèle est requis.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const corps = { type, nom, enteteNom, enteteAdresse, enteteSiret, enteteTelephone, enteteEmail, texteIntro, piedDePage };
    const url = modele ? `/api/super-admin/modeles-documents/${modele.id}` : "/api/super-admin/modeles-documents";
    const reponse = await fetch(url, {
      method: modele ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-neutral-100 shadow-xl">
        <h3 className="text-base font-semibold">{modele ? "Modifier le modèle" : "Nouveau modèle"}</h3>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-neutral-400">
            Nom du modèle
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex : Modèle 2026"
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-neutral-400">
              Nom affiché en en-tête
              <input
                value={enteteNom}
                onChange={(e) => setEnteteNom(e.target.value)}
                placeholder="SAS Optique & Audition"
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
            <label className="block text-xs text-neutral-400">
              SIRET
              <input
                value={enteteSiret}
                onChange={(e) => setEnteteSiret(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          </div>
          <label className="block text-xs text-neutral-400">
            Adresse
            <input
              value={enteteAdresse}
              onChange={(e) => setEnteteAdresse(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-neutral-400">
              Téléphone
              <input
                value={enteteTelephone}
                onChange={(e) => setEnteteTelephone(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
            <label className="block text-xs text-neutral-400">
              Email
              <input
                value={enteteEmail}
                onChange={(e) => setEnteteEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
          </div>
          <label className="block text-xs text-neutral-400">
            Texte d&apos;introduction (optionnel, sous le titre)
            <textarea
              value={texteIntro}
              onChange={(e) => setTexteIntro(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            />
          </label>
          <label className="block text-xs text-neutral-400">
            Pied de page (mentions légales, CGV...)
            <textarea
              value={piedDePage}
              onChange={(e) => setPiedDePage(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            />
          </label>
        </div>

        {erreur && <p className="mt-2 text-xs text-red-400">{erreur}</p>}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={enregistrer}
            disabled={envoi}
            className="rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button onClick={onFermer} className="text-xs text-neutral-400 hover:underline">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
