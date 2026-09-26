"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Fournisseur, HistoriquePrix, Magasin, Produit, Stock } from "@prisma/client";
import Carrousel from "@/components/Carrousel";
import { formaterPrix, parserPrixEnCentimes } from "@/lib/argent";

type StockAvecMagasin = Stock & { magasin: Magasin };
type ProduitAvecRelations = Produit & {
  stocks: StockAvecMagasin[];
  historiquePrix: HistoriquePrix[];
  fournisseur: Fournisseur | null;
};

const LIBELLE_TYPE: Record<string, string> = {
  MONTURE: "Monture",
  VERRE: "Verre",
  LENTILLE: "Lentille",
  ACCESSOIRE: "Accessoire",
  APPAREIL_AUDITIF: "Appareil auditif",
  ECOUTEUR: "Écouteur",
  PILE_AUDITIVE: "Pile auditive",
  ACCESSOIRE_AUDITIF: "Accessoire auditif",
};

const EMOJI_TYPE: Record<string, string> = {
  MONTURE: "🕶️",
  VERRE: "🔬",
  LENTILLE: "👁️",
  ACCESSOIRE: "🧰",
  APPAREIL_AUDITIF: "🦻",
  ECOUTEUR: "🎧",
  PILE_AUDITIVE: "🔋",
  ACCESSOIRE_AUDITIF: "🧰",
};

export default function ProduitDetailClient({
  produit,
  magasins,
  fournisseurs,
}: {
  produit: ProduitAvecRelations;
  magasins: Magasin[];
  fournisseurs: Fournisseur[];
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
          <FicheProduit produit={produit} fournisseurs={fournisseurs} />
          <StockParMagasin produit={produit} magasins={magasins} />
          <QrCodeCarte produit={produit} />
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

function FicheProduit({ produit, fournisseurs }: { produit: Produit; fournisseurs: Fournisseur[] }) {
  const router = useRouter();
  const [champs, setChamps] = useState({
    marque: produit.marque,
    modele: produit.modele,
    statut: produit.statut as string,
    prix: (produit.prixTTC / 100).toFixed(2).replace(".", ","),
    garantieMois: produit.garantieMois?.toString() ?? "",
    qrcode: produit.qrcode ?? "",
    categorie: produit.categorie ?? "",
    taille: produit.taille ?? "",
    coloris: produit.coloris ?? "",
    nomenclature: produit.nomenclature ?? "",
    prixAchat: produit.prixAchat != null ? (produit.prixAchat / 100).toFixed(2).replace(".", ",") : "",
    coefficient: produit.coefficient?.toString() ?? "",
    tauxTva: produit.tauxTva != null ? (produit.tauxTva * 100).toString() : "",
    prixVenteHT: produit.prixVenteHT != null ? (produit.prixVenteHT / 100).toFixed(2).replace(".", ",") : "",
    plafondRemise: produit.plafondRemise != null ? (produit.plafondRemise * 100).toString() : "",
    remarque: produit.remarque ?? "",
    fournisseurId: produit.fournisseurId ?? "",
  });
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function enregistrer() {
    const prixTTC = parserPrixEnCentimes(champs.prix);
    if (prixTTC === null) {
      setMessage("Prix TTC invalide.");
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
        statut: champs.statut,
        prixTTC,
        garantieMois: champs.garantieMois.trim() ? Number(champs.garantieMois) : null,
        qrcode: champs.qrcode || null,
        categorie: champs.categorie || null,
        taille: champs.taille || null,
        coloris: champs.coloris || null,
        nomenclature: champs.nomenclature || null,
        prixAchat: champs.prixAchat.trim() ? parserPrixEnCentimes(champs.prixAchat) : null,
        coefficient: champs.coefficient.trim() ? Number(champs.coefficient.replace(",", ".")) : null,
        tauxTva: champs.tauxTva.trim() ? Number(champs.tauxTva.replace(",", ".")) / 100 : null,
        prixVenteHT: champs.prixVenteHT.trim() ? parserPrixEnCentimes(champs.prixVenteHT) : null,
        plafondRemise: champs.plafondRemise.trim() ? Number(champs.plafondRemise.replace(",", ".")) / 100 : null,
        remarque: champs.remarque || null,
        fournisseurId: champs.fournisseurId || null,
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

        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            Catégorie
            <input
              value={champs.categorie}
              onChange={(e) => setChamps({ ...champs, categorie: e.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Taille
            <input
              value={champs.taille}
              onChange={(e) => setChamps({ ...champs, taille: e.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Coloris
            <input
              value={champs.coloris}
              onChange={(e) => setChamps({ ...champs, coloris: e.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm">
          Nomenclature (code LPP/sécurité sociale)
          <input
            value={champs.nomenclature}
            onChange={(e) => setChamps({ ...champs, nomenclature: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Prix achat (€)
            <input
              value={champs.prixAchat}
              onChange={(e) => setChamps({ ...champs, prixAchat: e.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Coefficient
            <input
              value={champs.coefficient}
              onChange={(e) => setChamps({ ...champs, coefficient: e.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            Prix public TTC (€)
            <input
              value={champs.prix}
              onChange={(e) => setChamps({ ...champs, prix: e.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Taux TVA (%)
            <input
              value={champs.tauxTva}
              onChange={(e) => setChamps({ ...champs, tauxTva: e.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            Prix vente HT (€)
            <input
              value={champs.prixVenteHT}
              onChange={(e) => setChamps({ ...champs, prixVenteHT: e.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm">
          Plafond remise (%)
          <input
            value={champs.plafondRemise}
            onChange={(e) => setChamps({ ...champs, plafondRemise: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          QR code (si différent de la référence)
          <input
            value={champs.qrcode}
            onChange={(e) => setChamps({ ...champs, qrcode: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          Fournisseur
          <select
            value={champs.fournisseurId}
            onChange={(e) => setChamps({ ...champs, fournisseurId: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">— Aucun —</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-neutral-400">
            Interne — jamais imprimé sur devis/facture, transmis avec la marque sur les demandes de prise en charge.
          </span>
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
          Garantie constructeur (mois)
          <input
            value={champs.garantieMois}
            onChange={(e) => setChamps({ ...champs, garantieMois: e.target.value })}
            placeholder="ex. 24 — laisser vide si inconnue"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          Remarque
          <textarea
            value={champs.remarque}
            onChange={(e) => setChamps({ ...champs, remarque: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-500">
          <span className="font-medium text-neutral-600">Description (générée automatiquement) : </span>
          {produit.description || "—"}
        </div>
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

function QrCodeCarte({ produit }: { produit: Produit }) {
  return (
    <Carte
      titre="QR code"
      sousTitre="À imprimer/apposer sur l'article — ouvre directement la page de scan."
      emoji="🔳"
      degrade="from-fuchsia-400 to-indigo-500"
    >
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- image générée dynamiquement par une route API, pas un asset optimisable par next/image */}
        <img
          src={`/api/produits/${produit.id}/qrcode`}
          alt={`QR code du produit ${produit.reference}`}
          width={220}
          height={220}
          className="rounded-xl border border-neutral-200"
        />
        <p className="text-center text-sm text-neutral-500">
          Scanné depuis un smartphone/tablette connecté à l&apos;application, il ouvre directement la saisie de stock
          de cet article.
        </p>
        <a
          href={`/api/produits/${produit.id}/qrcode`}
          download={`qrcode-${produit.reference}.png`}
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Télécharger le PNG
        </a>
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
