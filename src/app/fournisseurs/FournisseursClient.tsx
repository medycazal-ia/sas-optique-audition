"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Fournisseur } from "@prisma/client";

type FournisseurAvecCompte = Fournisseur & { _count: { produits: number } };

export default function FournisseursClient({ fournisseurs }: { fournisseurs: FournisseurAvecCompte[] }) {
  const router = useRouter();
  const [creation, setCreation] = useState(false);
  const [edition, setEdition] = useState<string | null>(null);

  function actualiser() {
    setCreation(false);
    setEdition(null);
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setCreation((v) => !v)}
        className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-neutral-700"
      >
        {creation ? "Annuler" : "+ Nouveau fournisseur"}
      </button>

      {creation && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <FormulaireFournisseur onEnregistre={actualiser} />
        </div>
      )}

      {fournisseurs.length === 0 ? (
        <p className="mt-8 rounded-2xl border-2 border-dashed border-neutral-300 bg-white/60 p-10 text-center text-neutral-500">
          Aucun fournisseur pour l&apos;instant.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {fournisseurs.map((f) => (
            <li key={f.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              {edition === f.id ? (
                <FormulaireFournisseur fournisseur={f} onEnregistre={actualiser} onAnnuler={() => setEdition(null)} />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900">{f.nom}</p>
                    <p className="text-sm text-neutral-500">
                      {f._count.produits} produit{f._count.produits > 1 ? "s" : ""} rattaché
                      {f._count.produits > 1 ? "s" : ""}
                    </p>
                    {f.contact && <p className="mt-1 text-sm text-neutral-600">Contact : {f.contact}</p>}
                    {f.sav && <p className="text-sm text-neutral-600">SAV : {f.sav}</p>}
                    {f.conditionsCommerciales && (
                      <p className="text-sm text-neutral-600">Conditions : {f.conditionsCommerciales}</p>
                    )}
                    {f.remarques && <p className="mt-1 text-sm italic text-neutral-500">{f.remarques}</p>}
                  </div>
                  <button
                    onClick={() => setEdition(f.id)}
                    className="shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                  >
                    Modifier
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormulaireFournisseur({
  fournisseur,
  onEnregistre,
  onAnnuler,
}: {
  fournisseur?: Fournisseur;
  onEnregistre: () => void;
  onAnnuler?: () => void;
}) {
  const [champs, setChamps] = useState({
    nom: fournisseur?.nom ?? "",
    contact: fournisseur?.contact ?? "",
    sav: fournisseur?.sav ?? "",
    conditionsCommerciales: fournisseur?.conditionsCommerciales ?? "",
    remarques: fournisseur?.remarques ?? "",
  });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer() {
    if (!champs.nom.trim()) {
      setErreur("Le nom est requis.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const url = fournisseur ? `/api/fournisseurs/${fournisseur.id}` : "/api/fournisseurs";
    const methode = fournisseur ? "PATCH" : "POST";
    const reponse = await fetch(url, {
      method: methode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(champs),
    });
    setEnvoi(false);
    if (reponse.ok) {
      onEnregistre();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Une erreur est survenue.");
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        Nom *
        <input
          value={champs.nom}
          onChange={(e) => setChamps({ ...champs, nom: e.target.value })}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        Contact
        <input
          value={champs.contact}
          onChange={(e) => setChamps({ ...champs, contact: e.target.value })}
          placeholder="Nom, téléphone, email…"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        SAV
        <input
          value={champs.sav}
          onChange={(e) => setChamps({ ...champs, sav: e.target.value })}
          placeholder="Contact / procédure SAV chez ce fournisseur"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        Conditions commerciales
        <textarea
          value={champs.conditionsCommerciales}
          onChange={(e) => setChamps({ ...champs, conditionsCommerciales: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        Remarques
        <textarea
          value={champs.remarques}
          onChange={(e) => setChamps({ ...champs, remarques: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={enregistrer}
          disabled={envoi}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {envoi ? "Enregistrement…" : "Enregistrer"}
        </button>
        {onAnnuler && (
          <button onClick={onAnnuler} className="text-sm text-neutral-500 hover:underline">
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}
