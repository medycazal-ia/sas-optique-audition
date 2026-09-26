"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Fournisseur, Magasin } from "@prisma/client";
import { parserPrixEnCentimes } from "@/lib/argent";

const TYPES = [
  { valeur: "MONTURE", libelle: "Monture" },
  { valeur: "VERRE", libelle: "Verre" },
  { valeur: "LENTILLE", libelle: "Lentille" },
  { valeur: "ACCESSOIRE", libelle: "Accessoire" },
  { valeur: "APPAREIL_AUDITIF", libelle: "Appareil auditif" },
  { valeur: "ECOUTEUR", libelle: "Écouteur" },
  { valeur: "PILE_AUDITIVE", libelle: "Pile auditive" },
  { valeur: "ACCESSOIRE_AUDITIF", libelle: "Accessoire auditif" },
];

/**
 * Reprend toutes les rubriques du modèle d'import CSV en masse (voir
 * /produits/import) : toutes optionnelles sauf activité/type/marque/modèle/
 * référence/prix TTC, mais toutes présentes ici — le bouton "Ajouter au
 * catalogue" fait aussi office de bouton "validation" qui applique en direct
 * la quantité saisie sur le stock du magasin choisi.
 */
export default function NouveauProduitClient({
  magasins,
  fournisseurs,
}: {
  magasins: Magasin[];
  fournisseurs: Fournisseur[];
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const form = new FormData(event.currentTarget);
    const prixTTC = parserPrixEnCentimes(String(form.get("prix") ?? ""));
    if (prixTTC === null) {
      setErreur("Prix public TTC invalide.");
      setEnvoi(false);
      return;
    }
    const prixAchat = form.get("prixAchat") ? parserPrixEnCentimes(String(form.get("prixAchat"))) : null;
    const prixVenteHT = form.get("prixVenteHT") ? parserPrixEnCentimes(String(form.get("prixVenteHT"))) : null;
    const tauxTvaSaisi = String(form.get("tauxTva") ?? "").trim();
    const tauxTva = tauxTvaSaisi ? Number(tauxTvaSaisi.replace(",", ".")) / 100 : null;
    const plafondRemiseSaisi = String(form.get("plafondRemise") ?? "").trim();
    const plafondRemise = plafondRemiseSaisi ? Number(plafondRemiseSaisi.replace(",", ".")) / 100 : null;
    const quantite = String(form.get("quantite") ?? "").trim();
    const magasinId = String(form.get("magasinId") ?? "").trim();

    const payload = {
      type: form.get("type"),
      activite: form.get("activite"),
      reference: form.get("reference"),
      qrcode: form.get("qrcode") || undefined,
      categorie: form.get("categorie") || undefined,
      marque: form.get("marque"),
      modele: form.get("modele"),
      taille: form.get("taille") || undefined,
      coloris: form.get("coloris") || undefined,
      nomenclature: form.get("nomenclature") || undefined,
      prixTTC,
      prixAchat,
      coefficient: form.get("coefficient") || undefined,
      tauxTva,
      prixVenteHT,
      plafondRemise,
      remarque: form.get("remarque") || undefined,
      dateDerniereSortie: form.get("dateDerniereSortie") || undefined,
      garantieMois: form.get("garantieMois") || undefined,
      fournisseurId: form.get("fournisseurId") || undefined,
      magasinId: magasinId || undefined,
      quantite: quantite ? Number(quantite) : undefined,
    };

    try {
      const reponse = await fetch("/api/produits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await reponse.json();
      if (!reponse.ok) {
        setErreur(data.erreur ?? "Une erreur est survenue.");
        setEnvoi(false);
        return;
      }
      router.push(`/produits/${data.id}`);
    } catch {
      setErreur("Impossible de contacter le serveur.");
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-[28px] border border-neutral-200 bg-white p-6 shadow-lg">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Type *
          <select name="type" required defaultValue="MONTURE" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            {TYPES.map((t) => (
              <option key={t.valeur} value={t.valeur}>
                {t.libelle}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Activité *
          <select name="activite" required defaultValue="OPTIQUE" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="OPTIQUE">Optique</option>
            <option value="AUDITION">Audition</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Marque *
          <input name="marque" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          Nom (modèle) *
          <input name="modele" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Référence * (unique)
          <input name="reference" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          QR code (si différent de la référence)
          <input name="qrcode" placeholder="laisser vide = référence" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm">
          Catégorie
          <input name="categorie" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          Taille
          <input name="taille" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          Coloris
          <input name="coloris" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="block text-sm">
        Nomenclature (code LPP/sécurité sociale)
        <input name="nomenclature" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Prix achat (€)
          <input name="prixAchat" placeholder="ex. 45,00" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          Coefficient
          <input name="coefficient" placeholder="ex. 2,5" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm">
          Prix public TTC (€) *
          <input name="prix" required placeholder="129,90" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          Taux TVA (%)
          <input name="tauxTva" placeholder="ex. 20" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          Prix vente HT (€)
          <input name="prixVenteHT" placeholder="ex. 108,25" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="block text-sm">
        Plafond remise (%)
        <input name="plafondRemise" placeholder="ex. 10" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Date dernière sortie
          <input type="date" name="dateDerniereSortie" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          Garantie constructeur (mois)
          <input name="garantieMois" placeholder="ex. 24" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="block text-sm">
        Fournisseur
        <select name="fournisseurId" defaultValue="" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="">— Aucun —</option>
          {fournisseurs.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nom}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        Remarque
        <textarea name="remarque" rows={2} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </label>

      <div className="rounded-2xl border border-dashed border-neutral-300 p-4">
        <p className="text-sm font-medium text-neutral-700">Stock initial (optionnel)</p>
        <p className="mt-1 text-xs text-neutral-500">
          Appliqué directement au stock du magasin choisi dès la validation de ce formulaire.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="text-sm">
            Magasin
            <select name="magasinId" defaultValue="" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
              <option value="">— Aucun —</option>
              {magasins.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Quantité
            <input name="quantite" type="number" min={0} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </label>
        </div>
      </div>

      {erreur && <p className="text-sm text-red-600">{erreur}</p>}

      <button
        type="submit"
        disabled={envoi}
        className="w-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-50"
      >
        {envoi ? "Création…" : "✅ Valider et ajouter au catalogue"}
      </button>
    </form>
  );
}
