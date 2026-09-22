"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Document, Evenement, Ordonnance, Personne } from "@prisma/client";
import type { PieceRequise } from "@/lib/completude";

type PersonneAvecRelations = Personne & {
  documents: Document[];
  ordonnances: Ordonnance[];
  evenements: Evenement[];
};

export default function DossierDetailClient({
  personne,
  completude,
}: {
  personne: PersonneAvecRelations;
  completude: PieceRequise[];
}) {
  return (
    <div className="mt-8 space-y-6">
      <InformationsPersonnelles personne={personne} />
      <Completude dossierId={personne.id} completude={completude} />
      <ConsentementsRgpd personne={personne} />
      <SyntheseBesoin personne={personne} />
      <JournalEvenements evenements={personne.evenements} />
    </div>
  );
}

function Carte({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-neutral-900">{titre}</h2>
      {sousTitre && <p className="mt-1 text-sm text-neutral-500">{sousTitre}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InformationsPersonnelles({ personne }: { personne: Personne }) {
  const router = useRouter();
  const [champs, setChamps] = useState({
    telephone: personne.telephone ?? "",
    email: personne.email ?? "",
    adresse: personne.adresse ?? "",
    codePostal: personne.codePostal ?? "",
    ville: personne.ville ?? "",
  });
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function enregistrer() {
    setEnvoi(true);
    setMessage(null);
    const reponse = await fetch(`/api/dossiers/${personne.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(champs),
    });
    setEnvoi(false);
    if (reponse.ok) {
      setMessage("Enregistré.");
      router.refresh();
    } else {
      setMessage("Erreur lors de l'enregistrement.");
    }
  }

  return (
    <Carte titre="Coordonnées" sousTitre="Lues par les modules Devis, Mutuelle et Facturation — jamais ressaisies ailleurs.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Téléphone
          <input
            value={champs.telephone}
            onChange={(e) => setChamps({ ...champs, telephone: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Email
          <input
            value={champs.email}
            onChange={(e) => setChamps({ ...champs, email: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Adresse
          <input
            value={champs.adresse}
            onChange={(e) => setChamps({ ...champs, adresse: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Code postal
          <input
            value={champs.codePostal}
            onChange={(e) => setChamps({ ...champs, codePostal: e.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Ville
          <input
            value={champs.ville}
            onChange={(e) => setChamps({ ...champs, ville: e.target.value })}
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

function Completude({ dossierId, completude }: { dossierId: string; completude: PieceRequise[] }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);

  async function marquerObtenue(type: PieceRequise["type"]) {
    setEnCours(type);
    await fetch(`/api/dossiers/${dossierId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    setEnCours(null);
    router.refresh();
  }

  return (
    <Carte titre="Complétude du dossier" sousTitre="Pièce suivante à fournir, plutôt qu'un formulaire libre.">
      <ul className="divide-y divide-neutral-100">
        {completude.map((piece) => (
          <li key={piece.type} className="flex items-center justify-between py-2">
            <span className="text-sm text-neutral-800">{piece.libelle}</span>
            {piece.obtenue ? (
              <span className="text-sm font-medium text-emerald-600">✓ Obtenue</span>
            ) : (
              <button
                onClick={() => marquerObtenue(piece.type)}
                disabled={enCours === piece.type}
                className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
              >
                {enCours === piece.type ? "…" : "Marquer comme obtenue"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </Carte>
  );
}

function ConsentementsRgpd({ personne }: { personne: Personne }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<"email" | "sms" | null>(null);

  async function basculer(champ: "consentementEmail" | "consentementSms", valeurActuelle: boolean) {
    setEnCours(champ === "consentementEmail" ? "email" : "sms");
    await fetch(`/api/dossiers/${personne.id}/consentements`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [champ]: !valeurActuelle }),
    });
    setEnCours(null);
    router.refresh();
  }

  return (
    <Carte titre="Consentements RGPD" sousTitre="Modifiables à tout moment par le client, horodatés à chaque changement.">
      <div className="space-y-3">
        <ConsentementLigne
          libelle="Email"
          actif={personne.consentementEmail}
          horodatage={personne.consentementEmailA}
          enCours={enCours === "email"}
          onBascule={() => basculer("consentementEmail", personne.consentementEmail)}
        />
        <ConsentementLigne
          libelle="SMS"
          actif={personne.consentementSms}
          horodatage={personne.consentementSmsA}
          enCours={enCours === "sms"}
          onBascule={() => basculer("consentementSms", personne.consentementSms)}
        />
      </div>
    </Carte>
  );
}

function ConsentementLigne({
  libelle,
  actif,
  horodatage,
  enCours,
  onBascule,
}: {
  libelle: string;
  actif: boolean;
  horodatage: Date | null;
  enCours: boolean;
  onBascule: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-neutral-800">{libelle}</p>
        {horodatage && (
          <p className="text-xs text-neutral-500">
            {actif ? "Consenti" : "Refusé"} le {new Date(horodatage).toLocaleString("fr-FR")}
          </p>
        )}
      </div>
      <button
        onClick={onBascule}
        disabled={enCours}
        className={`rounded-full px-4 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
          actif ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-700"
        }`}
      >
        {enCours ? "…" : actif ? "Consenti" : "Non consenti"}
      </button>
    </div>
  );
}

function SyntheseBesoin({ personne }: { personne: Personne }) {
  const router = useRouter();
  const [texte, setTexte] = useState(personne.syntheseBesoin ?? "");
  const [validePar, setValidePar] = useState("");
  const [envoi, setEnvoi] = useState<"brouillon" | "validation" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const modifieDepuisValidation = texte !== (personne.syntheseBesoin ?? "");
  const estValidee = Boolean(personne.syntheseBesoinValideeA) && !modifieDepuisValidation;

  async function enregistrerBrouillon() {
    setEnvoi("brouillon");
    setMessage(null);
    await fetch(`/api/dossiers/${personne.id}/synthese`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syntheseBesoin: texte }),
    });
    setEnvoi(null);
    setMessage("Brouillon enregistré — validation humaine requise avant d'être acté.");
    router.refresh();
  }

  async function valider() {
    if (!validePar.trim()) {
      setMessage("Indiquer qui valide la synthèse.");
      return;
    }
    setEnvoi("validation");
    setMessage(null);
    const reponse = await fetch(`/api/dossiers/${personne.id}/synthese/valider`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validePar }),
    });
    setEnvoi(null);
    if (reponse.ok) {
      setMessage("Synthèse validée et actée dans le dossier.");
      router.refresh();
    } else {
      setMessage("Erreur lors de la validation.");
    }
  }

  return (
    <Carte
      titre="Synthèse besoin (mini-audit vocal)"
      sousTitre="Généré par IA, éditable, jamais enregistré définitivement sans validation humaine explicite."
    >
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={5}
        placeholder="Habitudes, gêne, usage, attentes, budget, urgence, contexte de vie…"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />

      <div className="mt-2 text-xs">
        {estValidee ? (
          <span className="font-medium text-emerald-600">
            ✓ Validée le {new Date(personne.syntheseBesoinValideeA!).toLocaleString("fr-FR")} par{" "}
            {personne.syntheseBesoinValideePar}
          </span>
        ) : (
          <span className="text-amber-700">Non validée — ne sera pas actée dans le dossier tant que non validée.</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={enregistrerBrouillon}
          disabled={envoi !== null}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
        >
          {envoi === "brouillon" ? "Enregistrement…" : "Enregistrer le brouillon"}
        </button>

        <input
          value={validePar}
          onChange={(e) => setValidePar(e.target.value)}
          placeholder="Nom du collaborateur qui valide"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          onClick={valider}
          disabled={envoi !== null || !texte.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {envoi === "validation" ? "Validation…" : "Valider la synthèse"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-neutral-500">{message}</p>}
    </Carte>
  );
}

function JournalEvenements({ evenements }: { evenements: Evenement[] }) {
  return (
    <Carte titre="Journal d'événements" sousTitre="Qui a fait quoi, quand — jamais de modification silencieuse.">
      {evenements.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucun événement enregistré.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {evenements.map((evt) => (
            <li key={evt.id} className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="text-neutral-800">{evt.type}</span>
              <span className="text-xs text-neutral-400">
                {new Date(evt.survenuA).toLocaleString("fr-FR")} · {evt.acteur ?? "?"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Carte>
  );
}
