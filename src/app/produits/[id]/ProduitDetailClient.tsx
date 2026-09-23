"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HistoriquePrix, Magasin, Produit, Stock } from "@prisma/client";
import Carrousel from "@/components/Carrousel";
import { formaterPrix, parserPrixEnCentimes } from "@/lib/argent";

type StockAvecMagasin = Stock & { magasin: Magasin };
type ProduitAvecRelations = Produit & { stocks: StockAvecMagasin[]; historiquePrix: HistoriquePrix[] };

const LIBELLE_TYPE: Record<string, string> = {
  MONTURE: "Monture",
  VERRE: "Verre",
  LENTILLE: "Lentille",
  ACCESSOIRE: "Accessoire",
};

const EMOJI_TYPE: Record<string, string> = {
  MONTURE: "🕶️",
  VERRE: "🔬",
  LENTILLE: "👁️",
  ACCESSOIRE: "🧰",
};

export default function ProduitDetailClient({
  produit,
  magasins,
}: {
  produit: ProduitAvecRelations;
  magasins: Magasin[];
}) {
  const totalStock = produit.stocks.reduce((s, x) => s + x.quantite, 0);

  return (
    <>
      <div className="mt-3 flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-2xl shadow-md">
          {EMOJI_TYPE[produit.type]}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900">
            {produit.marque} {produit.modele}
          </h1>
          <p className="text-sm text-neutral-500">
            {LIBELLE_TYPE[produit.type]} · réf. {produit.reference} ·{" "}
            <span className={totalStock > 0 ? "text-emerald-600" : "text-amber-600"}>
              {totalStock > 0 ? `${totalStock} en stock` : "Rupture"}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Carrousel>
          <FicheProduit produit={produit} />
          <StockParMagasin produit={produit} magasins={magasins} />
          <HistoriquePrixCarte historiquePrix={produit.historiquePrix} />
        </Carrousel>
      </div>
    </>
  );
}

function Carte({
  titre,
  sousTitre,
  emoji,
  degrade,
  children,
}: {
  titre: string;
  sousTitre?: string;
  emoji: string;
  degrade: string;
  children: React.ReactNode;
}) {
  return (
    <section className="anim-pop flex h-[520px] w-[85vw] max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-lg">
      <div className={`flex items-center gap-3 bg-gradient-to-r ${degrade} px-6 py-5 text-white`}>
        <span className="text-3xl drop-shadow-sm">{emoji}</span>
        <div>
          <h2 className="text-lg font-bold leading-tight">{titre}</h2>
          {sousTitre && <p className="text-xs text-white/85">{sousTitre}</p>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </section>
  );
}

function FicheProduit({ produit }: { produit: Produit }) {
  const router = useRouter();
  const [champs, setChamps] = useState<{
    marque: string;
    modele: string;
    description: string;
    statut: string;
    prix: string;
  }>({
    marque: produit.marque,
    modele: produit.modele,
    description: produit.description ?? "",
    statut: produit.statut,
    prix: (produit.prixTTC / 100).toFixed(2).replace(".", ","),
  });
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function enregistrer() {
    const prixTTC = parserPrixEnCentimes(champs.prix);
    if (prixTTC === null) {
      setMessage("Prix invalide.");
      return;
    }
    setEnvoi(true);
    setMessage(null);
    const reponse = await fetch(`/api/produits/${produit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marque: champs.marque,
        modele: champs.modele,
        description: champs.description || null,
        statut: champs.statut,
        prixTTC,
      }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      setMessage("Enregistré.");
      router.refresh();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setMessage(data.erreur ?? "Erreur lors de l'enregistrement.");
    }
  }

  return (
    <Carte titre="Fiche produit" sousTitre="Tarif toujours à jour, jamais une valeur mise en cache." emoji="🏷️" degrade="from-teal-400 to-emerald-500">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Marque
            <input
              value={champs.marque}
              onChange={(e) => setChamps({ ...champs, marque: e.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Modèle
            <input
              value={champs.modele}
              onChange={(e) => setChamps({ ...champs, modele: e.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block text-sm">
          Prix TTC (€)
          <input
            value={champs.prix}
            onChange={(e) => setChamps({ ...champs, prix: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          Statut
          <select
            value={champs.statut}
            onChange={(e) => setChamps({ ...champs, statut: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="ACTIF">Actif</option>
            <option value="RUPTURE">En rupture</option>
            <option value="DISCONTINUE">Discontinué chez le fournisseur</option>
          </select>
        </label>
        <label className="block text-sm">
          Description
          <textarea
            value={champs.description}
            onChange={(e) => setChamps({ ...champs, description: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={enregistrer}
          disabled={envoi}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {envoi ? "Enregistrement…" : "Enregistrer"}
        </button>
        {message && <span className="text-sm text-neutral-500">{message}</span>}
      </div>
    </Carte>
  );
}

function StockParMagasin({ produit, magasins }: { produit: ProduitAvecRelations; magasins: Magasin[] }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [brouillons, setBrouillons] = useState<Record<string, { quantite: string; delai: string }>>({});

  function valeurPour(magasinId: string) {
    const existant = produit.stocks.find((s) => s.magasinId === magasinId);
    return (
      brouillons[magasinId] ?? {
        quantite: String(existant?.quantite ?? 0),
        delai: existant?.delaiJoursReappro != null ? String(existant.delaiJoursReappro) : "",
      }
    );
  }

  async function enregistrer(magasinId: string) {
    const valeurs = valeurPour(magasinId);
    const quantite = Number.parseInt(valeurs.quantite, 10);
    if (!Number.isInteger(quantite) || quantite < 0) return;

    setEnCours(magasinId);
    await fetch(`/api/produits/${produit.id}/stock`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        magasinId,
        quantite,
        delaiJoursReappro: valeurs.delai ? Number.parseInt(valeurs.delai, 10) : null,
      }),
    });
    setEnCours(null);
    router.refresh();
  }

  return (
    <Carte
      titre="Stock par magasin"
      sousTitre="Disponibilité consultable avant de promettre un délai au client."
      emoji="📦"
      degrade="from-sky-400 to-indigo-500"
    >
      {magasins.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Aucun magasin enregistré. Ajoutez-en un via <code className="rounded bg-neutral-100 px-1">POST /api/magasins</code>.
        </p>
      ) : (
        <ul className="space-y-4">
          {magasins.map((magasin) => {
            const valeurs = valeurPour(magasin.id);
            return (
              <li key={magasin.id} className="rounded-xl border border-neutral-200 p-3">
                <p className="text-sm font-medium text-neutral-800">{magasin.nom}</p>
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-neutral-500">
                    Quantité
                    <input
                      type="number"
                      min={0}
                      value={valeurs.quantite}
                      onChange={(e) =>
                        setBrouillons({ ...brouillons, [magasin.id]: { ...valeurs, quantite: e.target.value } })
                      }
                      className="mt-1 block w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs text-neutral-500">
                    Délai réappro (jours, si rupture)
                    <input
                      type="number"
                      min={0}
                      value={valeurs.delai}
                      onChange={(e) =>
                        setBrouillons({ ...brouillons, [magasin.id]: { ...valeurs, delai: e.target.value } })
                      }
                      className="mt-1 block w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <button
                    onClick={() => enregistrer(magasin.id)}
                    disabled={enCours === magasin.id}
                    className="mt-4 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {enCours === magasin.id ? "…" : "Mettre à jour"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Carte>
  );
}

function HistoriquePrixCarte({ historiquePrix }: { historiquePrix: HistoriquePrix[] }) {
  return (
    <Carte
      titre="Historique de prix"
      sousTitre="Jamais écrasé — traçabilité en cas de litige."
      emoji="🕰️"
      degrade="from-neutral-600 to-neutral-800"
    >
      {historiquePrix.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucun historique.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {historiquePrix.map((h) => (
            <li key={h.id} className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="font-medium text-neutral-800">{formaterPrix(h.prixTTC)}</span>
              <span className="text-xs text-neutral-400">
                {new Date(h.effectifA).toLocaleString("fr-FR")} {h.modifiePar ? `· ${h.modifiePar}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Carte>
  );
}
