"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Societe } from "@prisma/client";
import { champsObligatoiresManquantsSociete } from "@/lib/entiteLegale";

type Champs = {
  raisonSociale: string;
  formeJuridique: string;
  siret: string;
  numeroTvaIntracommunautaire: string;
  rcs: string;
  capitalSocial: string;
  codeApe: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  siteWeb: string;
  representantLegal: string;
  numeroFiness: string;
  assuranceRcProNom: string;
  assuranceRcProNumero: string;
  iban: string;
  bic: string;
};

function versChamps(s: Societe | null): Champs {
  return {
    raisonSociale: s?.raisonSociale ?? "",
    formeJuridique: s?.formeJuridique ?? "",
    siret: s?.siret ?? "",
    numeroTvaIntracommunautaire: s?.numeroTvaIntracommunautaire ?? "",
    rcs: s?.rcs ?? "",
    capitalSocial: s?.capitalSocial ?? "",
    codeApe: s?.codeApe ?? "",
    adresse: s?.adresse ?? "",
    codePostal: s?.codePostal ?? "",
    ville: s?.ville ?? "",
    telephone: s?.telephone ?? "",
    email: s?.email ?? "",
    siteWeb: s?.siteWeb ?? "",
    representantLegal: s?.representantLegal ?? "",
    numeroFiness: s?.numeroFiness ?? "",
    assuranceRcProNom: s?.assuranceRcProNom ?? "",
    assuranceRcProNumero: s?.assuranceRcProNumero ?? "",
    iban: s?.iban ?? "",
    bic: s?.bic ?? "",
  };
}

const CHAMP = "mt-1 w-full rounded-md border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500";
const LABEL = "text-xs font-medium text-neutral-200";

export default function SocieteClient({ societe }: { societe: Societe | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [champs, setChamps] = useState<Champs>(() => versChamps(societe));
  const [envoi, setEnvoi] = useState(false);
  const [extraction, setExtraction] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const manquants = champsObligatoiresManquantsSociete(champs);

  function set<K extends keyof Champs>(cle: K, valeur: string) {
    setChamps((c) => ({ ...c, [cle]: valeur }));
  }

  async function extraire() {
    const fichier = inputRef.current?.files?.[0];
    if (!fichier) return;
    setExtraction(true);
    setErreur(null);
    setMessage(null);
    try {
      const donnees = new FormData();
      donnees.append("fichier", fichier);
      const reponse = await fetch("/api/super-admin/entite-legale/extraire", { method: "POST", body: donnees });
      const data = await reponse.json();
      if (!reponse.ok) {
        setErreur(data.erreur ?? "Échec de l'extraction.");
      } else {
        setChamps((c) => ({
          ...c,
          ...Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v === "string" && v)),
        }));
        setMessage("Champs extraits — relisez avant d'enregistrer.");
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
    setMessage(null);
    const reponse = await fetch("/api/super-admin/societe", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(champs),
    });
    setEnvoi(false);
    if (reponse.ok) {
      setMessage("Enregistré.");
      router.refresh();
    } else {
      const data = await reponse.json().catch(() => ({}));
      setErreur(data.erreur ?? "Erreur lors de l'enregistrement.");
    }
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
          <h1 className="mt-4 text-2xl font-semibold text-white">🏢 Société</h1>
          <p className="mt-2 text-sm text-neutral-300">
            Entité juridique acheteuse du logiciel — un seul enregistrement, utilisé comme identité par défaut sur
            les documents générés. Toutes les rubriques restent modifiables à tout moment.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-6 px-6">
        {manquants.length > 0 && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            ⚠️ Rubriques obligatoires manquantes : {manquants.join(", ")}.
          </div>
        )}

        <section className="rounded-2xl border border-neutral-700 bg-neutral-900 p-5">
          <h2 className="text-sm font-semibold text-white">Préremplir depuis un document</h2>
          <p className="mt-1 text-xs text-neutral-400">
            Téléversez une facture, un devis ou un papier en-tête où figurent vos mentions légales — les champs
            lisibles seront proposés ci-dessous, à relire avant d&apos;enregistrer.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input ref={inputRef} type="file" accept="image/*,.pdf" className="text-xs text-neutral-300" />
            <button
              onClick={extraire}
              disabled={extraction}
              className="rounded-md border border-amber-400/60 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
            >
              {extraction ? "Extraction…" : "Extraire"}
            </button>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-neutral-700 bg-neutral-900 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL}>
              Raison sociale
              <input value={champs.raisonSociale} onChange={(e) => set("raisonSociale", e.target.value)} className={CHAMP} />
            </label>
            <label className={LABEL}>
              Forme juridique
              <input
                value={champs.formeJuridique}
                onChange={(e) => set("formeJuridique", e.target.value)}
                placeholder="SARL, SAS, EI…"
                className={CHAMP}
              />
            </label>
            <label className={LABEL}>
              SIRET
              <input value={champs.siret} onChange={(e) => set("siret", e.target.value)} placeholder="14 chiffres" className={CHAMP} />
            </label>
            <label className={LABEL}>
              N° de TVA intracommunautaire
              <input
                value={champs.numeroTvaIntracommunautaire}
                onChange={(e) => set("numeroTvaIntracommunautaire", e.target.value)}
                className={CHAMP}
              />
            </label>
            <label className={LABEL}>
              RCS
              <input value={champs.rcs} onChange={(e) => set("rcs", e.target.value)} placeholder="RCS Paris 123 456 789" className={CHAMP} />
            </label>
            <label className={LABEL}>
              Capital social
              <input value={champs.capitalSocial} onChange={(e) => set("capitalSocial", e.target.value)} placeholder="10 000 € — ou « non applicable »" className={CHAMP} />
            </label>
            <label className={LABEL}>
              Code APE/NAF
              <input value={champs.codeApe} onChange={(e) => set("codeApe", e.target.value)} className={CHAMP} />
            </label>
            <label className={LABEL}>
              N° FINESS (si unique pour toute la société)
              <input value={champs.numeroFiness} onChange={(e) => set("numeroFiness", e.target.value)} className={CHAMP} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className={`${LABEL} sm:col-span-3`}>
              Adresse du siège
              <input value={champs.adresse} onChange={(e) => set("adresse", e.target.value)} className={CHAMP} />
            </label>
            <label className={LABEL}>
              Code postal
              <input value={champs.codePostal} onChange={(e) => set("codePostal", e.target.value)} className={CHAMP} />
            </label>
            <label className={`${LABEL} sm:col-span-2`}>
              Ville
              <input value={champs.ville} onChange={(e) => set("ville", e.target.value)} className={CHAMP} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className={LABEL}>
              Téléphone
              <input value={champs.telephone} onChange={(e) => set("telephone", e.target.value)} className={CHAMP} />
            </label>
            <label className={LABEL}>
              Email
              <input value={champs.email} onChange={(e) => set("email", e.target.value)} className={CHAMP} />
            </label>
            <label className={LABEL}>
              Site web
              <input value={champs.siteWeb} onChange={(e) => set("siteWeb", e.target.value)} className={CHAMP} />
            </label>
          </div>

          <label className={LABEL}>
            Représentant légal
            <input value={champs.representantLegal} onChange={(e) => set("representantLegal", e.target.value)} className={CHAMP} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL}>
              Assureur RC Pro
              <input value={champs.assuranceRcProNom} onChange={(e) => set("assuranceRcProNom", e.target.value)} className={CHAMP} />
            </label>
            <label className={LABEL}>
              N° de police RC Pro
              <input value={champs.assuranceRcProNumero} onChange={(e) => set("assuranceRcProNumero", e.target.value)} className={CHAMP} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL}>
              IBAN (remboursements centralisés, si applicable)
              <input value={champs.iban} onChange={(e) => set("iban", e.target.value)} className={CHAMP} />
            </label>
            <label className={LABEL}>
              BIC
              <input value={champs.bic} onChange={(e) => set("bic", e.target.value)} className={CHAMP} />
            </label>
          </div>

          {erreur && <p className="text-sm text-red-400">{erreur}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}

          <button
            onClick={enregistrer}
            disabled={envoi}
            className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-neutral-950 shadow-[0_0_25px_rgba(217,164,65,0.35)] transition hover:scale-105 disabled:opacity-50"
          >
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </button>
        </section>
      </div>
    </div>
  );
}
