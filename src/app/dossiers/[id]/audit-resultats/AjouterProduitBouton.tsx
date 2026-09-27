"use client";

import { useState } from "react";

/**
 * "Ajouter au devis" depuis le document de recommandations (audit) — trouve
 * ou crée le devis en brouillon du dossier, puis y ajoute le produit.
 * Même logique que dans la carte Audit (voir DossierDetailClient.tsx).
 */
export default function AjouterProduitBouton({ personneId, produitId }: { personneId: string; produitId: string }) {
  const [etat, setEtat] = useState<"repos" | "envoi" | "fait" | "erreur">("repos");
  const [message, setMessage] = useState<string | null>(null);

  async function ajouter() {
    setEtat("envoi");
    setMessage(null);
    try {
      const propositions = await fetch(`/api/dossiers/${personneId}/propositions`).then((r) => r.json());
      let propositionId = propositions.find((p: { statut: string; id: string }) => p.statut === "BROUILLON")?.id;
      if (!propositionId) {
        const nouvelle = await fetch(`/api/dossiers/${personneId}/propositions`, { method: "POST" }).then((r) => r.json());
        propositionId = nouvelle.id;
      }
      const reponse = await fetch(`/api/propositions/${propositionId}/lignes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produitId }),
      });
      if (reponse.ok) {
        setEtat("fait");
      } else {
        const data = await reponse.json().catch(() => ({}));
        setEtat("erreur");
        setMessage(data.erreur ?? "Erreur.");
      }
    } catch {
      setEtat("erreur");
      setMessage("Erreur réseau.");
    }
  }

  if (etat === "fait") {
    return <span className="text-xs font-medium text-emerald-600">✓ Ajouté au devis</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={ajouter}
        disabled={etat === "envoi"}
        className="rounded-md bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {etat === "envoi" ? "…" : "Ajouter au devis"}
      </button>
      {message && <span className="text-xs text-red-600">{message}</span>}
    </div>
  );
}
