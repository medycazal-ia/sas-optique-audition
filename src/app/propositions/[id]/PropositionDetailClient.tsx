"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Produit, Proposition, PropositionLigne } from "@prisma/client";
import { formaterPrix } from "@/lib/argent";

type PropositionComplete = Proposition & {
  personne: { id: string; prenom: string; nom: string };
  lignes: (PropositionLigne & { produit: Produit })[];
  remplace: { id: string; statut: string; creeA: Date } | null;
  remplaceePar: { id: string; statut: string; creeA: Date } | null;
};

const LIBELLE_STATUT: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyée",
  ACCEPTEE: "Acceptée",
  REFUSEE: "Refusée",
  EXPIREE: "Expirée",
};

const COULEUR_STATUT: Record<string, string> = {
  BROUILLON: "bg-neutral-200 text-neutral-700",
  ENVOYEE: "bg-sky-100 text-sky-700",
  ACCEPTEE: "bg-emerald-100 text-emerald-700",
  REFUSEE: "bg-red-100 text-red-700",
  EXPIREE: "bg-amber-100 text-amber-700",
};

export default function PropositionDetailClient({ proposition }: { proposition: PropositionComplete }) {
  const router = useRouter();
  const estBrouillon = proposition.statut === "BROUILLON";
  const estEnvoyee = proposition.statut === "ENVOYEE";
  const total = proposition.lignes.reduce((s, l) => s + l.prixUnitaireTTC * l.quantite, 0);

  function actualiser() {
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${COULEUR_STATUT[proposition.statut]}`}>
          {LIBELLE_STATUT[proposition.statut]}
        </span>
        <h1 className="text-xl font-bold text-neutral-900">Proposition du {new Date(proposition.creeA).toLocaleDateString("fr-FR")}</h1>
      </div>

      {proposition.remplace && (
        <p className="text-sm text-neutral-500">
          Remplace la{" "}
          <Link href={`/propositions/${proposition.remplace.id}`} className="underline">
            proposition du {new Date(proposition.remplace.creeA).toLocaleDateString("fr-FR")} ({LIBELLE_STATUT[proposition.remplace.statut]})
          </Link>
          .
        </p>
      )}
      {proposition.remplaceePar && (
        <p className="text-sm text-amber-700">
          Remplacée par la{" "}
          <Link href={`/propositions/${proposition.remplaceePar.id}`} className="underline">
            proposition du {new Date(proposition.remplaceePar.creeA).toLocaleDateString("fr-FR")}
          </Link>
          .
        </p>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="font-semibold text-neutral-900">Lignes</h2>
        {proposition.lignes.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Aucun produit ajouté pour l&apos;instant.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {proposition.lignes.map((ligne) => (
              <li key={ligne.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-neutral-800">{ligne.libelleProduit}</p>
                  <p className="text-xs text-neutral-500">
                    {ligne.quantite} × {formaterPrix(ligne.prixUnitaireTTC)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-neutral-900">{formaterPrix(ligne.prixUnitaireTTC * ligne.quantite)}</span>
                  {estBrouillon && <RetirerLigne propositionId={proposition.id} ligneId={ligne.id} onFait={actualiser} />}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3">
          <span className="font-semibold text-neutral-900">Total</span>
          <span className="text-lg font-bold text-neutral-900">{formaterPrix(total)}</span>
        </div>
        {proposition.resteAChargeTTC !== null && (
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-emerald-700">Reste à charge (après mutuelle)</span>
            <span className="font-semibold text-emerald-700">{formaterPrix(proposition.resteAChargeTTC)}</span>
          </div>
        )}
      </section>

      {estBrouillon && <AjouterProduit propositionId={proposition.id} onFait={actualiser} />}

      {estBrouillon && <NotesEtOptions proposition={proposition} onFait={actualiser} />}

      <Actions proposition={proposition} onFait={actualiser} />
    </div>
  );
}

function RetirerLigne({ propositionId, ligneId, onFait }: { propositionId: string; ligneId: string; onFait: () => void }) {
  const [envoi, setEnvoi] = useState(false);
  async function retirer() {
    setEnvoi(true);
    await fetch(`/api/propositions/${propositionId}/lignes/${ligneId}`, { method: "DELETE" });
    setEnvoi(false);
    onFait();
  }
  return (
    <button onClick={retirer} disabled={envoi} className="text-xs text-red-500 hover:underline disabled:opacity-50">
      {envoi ? "…" : "Retirer"}
    </button>
  );
}

type ResultatRecherche = Produit & { stocks: { quantite: number }[] };

function AjouterProduit({ propositionId, onFait }: { propositionId: string; onFait: () => void }) {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<ResultatRecherche[]>([]);
  const [recherche, setRecherche] = useState(false);
  const [messageParProduit, setMessageParProduit] = useState<Record<string, string>>({});
  const [ajoutEnCours, setAjoutEnCours] = useState<string | null>(null);

  async function rechercher(event: React.FormEvent) {
    event.preventDefault();
    setRecherche(true);
    const reponse = await fetch(`/api/produits?q=${encodeURIComponent(q)}`);
    const data = await reponse.json();
    setResultats(data);
    setRecherche(false);
  }

  async function ajouter(produitId: string, forcerSansStock = false) {
    setAjoutEnCours(produitId);
    const reponse = await fetch(`/api/propositions/${propositionId}/lignes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produitId, quantite: 1, forcerSansStock }),
    });
    setAjoutEnCours(null);
    if (reponse.ok) {
      setMessageParProduit((m) => ({ ...m, [produitId]: "" }));
      onFait();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setMessageParProduit((m) => ({
        ...m,
        [produitId]: data.erreur
          ? `${data.erreur}${data.delaiJoursReappro ? ` (délai estimé : ${data.delaiJoursReappro} j)` : ""}`
          : "Erreur.",
      }));
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h2 className="font-semibold text-neutral-900">Ajouter un produit</h2>
      <form onSubmit={rechercher} className="mt-2 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Référence, marque, modèle…"
          className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm"
        />
        <button type="submit" disabled={recherche} className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          {recherche ? "…" : "Rechercher"}
        </button>
      </form>

      {resultats.length > 0 && (
        <ul className="mt-3 space-y-2">
          {resultats.map((produit) => {
            const dispo = produit.stocks.some((s) => s.quantite > 0);
            const message = messageParProduit[produit.id];
            return (
              <li key={produit.id} className="rounded-lg border border-neutral-200 p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    {produit.marque} {produit.modele} — {formaterPrix(produit.prixTTC)}{" "}
                    <span className={dispo ? "text-emerald-600" : "text-amber-600"}>{dispo ? "· en stock" : "· rupture"}</span>
                  </span>
                  <button
                    onClick={() => ajouter(produit.id)}
                    disabled={ajoutEnCours === produit.id}
                    className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {ajoutEnCours === produit.id ? "…" : "+ Ajouter"}
                  </button>
                </div>
                {message && (
                  <p className="mt-1 text-xs text-amber-700">
                    {message}{" "}
                    <button onClick={() => ajouter(produit.id, true)} className="underline">
                      Ajouter quand même
                    </button>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function NotesEtOptions({ proposition, onFait }: { proposition: Proposition; onFait: () => void }) {
  const [notes, setNotes] = useState(proposition.notes ?? "");
  const [cent100Sante, setCent100Sante] = useState(proposition.cent100Sante);
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer() {
    setEnvoi(true);
    await fetch(`/api/propositions/${proposition.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, cent100Sante }),
    });
    setEnvoi(false);
    onFait();
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h2 className="font-semibold text-neutral-900">Notes & options</h2>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={cent100Sante} onChange={(e) => setCent100Sante(e.target.checked)} />
        Dispositif 100% Santé
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Notes internes sur cette proposition…"
        className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <button
        onClick={enregistrer}
        disabled={envoi}
        className="mt-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
      >
        {envoi ? "…" : "Enregistrer"}
      </button>
    </section>
  );
}

function Actions({ proposition, onFait }: { proposition: Proposition; onFait: () => void }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function envoyer() {
    setEnvoi(true);
    setMessage(null);
    const reponse = await fetch(`/api/propositions/${proposition.id}/envoyer`, { method: "POST" });
    setEnvoi(false);
    if (reponse.ok) onFait();
    else {
      const data = await reponse.json().catch(() => ({}));
      setMessage(data.erreur ?? "Erreur.");
    }
  }

  async function decider(decision: "ACCEPTEE" | "REFUSEE") {
    setEnvoi(true);
    setMessage(null);
    const reponse = await fetch(`/api/propositions/${proposition.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setEnvoi(false);
    if (reponse.ok) onFait();
    else {
      const data = await reponse.json().catch(() => ({}));
      setMessage(data.erreur ?? "Erreur.");
    }
  }

  async function nouvelleVersion() {
    setEnvoi(true);
    const reponse = await fetch(`/api/dossiers/${proposition.personneId}/propositions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remplaceId: proposition.id }),
    });
    setEnvoi(false);
    if (reponse.ok) {
      const nouvelle = await reponse.json();
      router.push(`/propositions/${nouvelle.id}`);
    }
  }

  return (
    <section className="flex flex-wrap items-center gap-3">
      {proposition.statut === "BROUILLON" && (
        <button
          onClick={envoyer}
          disabled={envoi}
          className="rounded-full bg-gradient-to-r from-sky-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:scale-105 disabled:opacity-50"
        >
          {envoi ? "…" : "Envoyer au client"}
        </button>
      )}
      {proposition.statut === "ENVOYEE" && (
        <>
          <button
            onClick={() => decider("ACCEPTEE")}
            disabled={envoi}
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Marquer acceptée
          </button>
          <button
            onClick={() => decider("REFUSEE")}
            disabled={envoi}
            className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Marquer refusée
          </button>
        </>
      )}
      {(proposition.statut === "REFUSEE" || proposition.statut === "EXPIREE") && !proposition.remplaceId && (
        <button
          onClick={nouvelleVersion}
          disabled={envoi}
          className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"
        >
          Composer une nouvelle version
        </button>
      )}
      {message && <span className="text-sm text-red-600">{message}</span>}
    </section>
  );
}
