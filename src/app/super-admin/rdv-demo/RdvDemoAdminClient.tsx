"use client";

import { useState } from "react";

type Config = {
  variablesGoogleConfigurees: boolean;
  connecte: boolean;
  googleEmailCompte: string | null;
  connecteA: string | null;
  connectePar: string | null;
  dureeCreneauMinutes: number;
  heureDebut: string;
  heureFin: string;
  joursOuvres: number[];
};

const LIBELLE_JOUR: Record<number, string> = {
  0: "Dim",
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Jeu",
  5: "Ven",
  6: "Sam",
};

export default function RdvDemoAdminClient({ config: initial, messageInitial }: { config: Config; messageInitial: string | null }) {
  const [config, setConfig] = useState(initial);
  const [message, setMessage] = useState(messageInitial);
  const [envoi, setEnvoi] = useState(false);

  function basculerJour(jour: number) {
    setConfig((c) => ({
      ...c,
      joursOuvres: c.joursOuvres.includes(jour) ? c.joursOuvres.filter((j) => j !== jour) : [...c.joursOuvres, jour].sort(),
    }));
  }

  async function enregistrer() {
    setEnvoi(true);
    setMessage(null);
    const reponse = await fetch("/api/super-admin/rdv-demo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dureeCreneauMinutes: config.dureeCreneauMinutes,
        heureDebut: config.heureDebut,
        heureFin: config.heureFin,
        joursOuvres: config.joursOuvres,
      }),
    });
    setEnvoi(false);
    setMessage(reponse.ok ? "Enregistré." : "Échec de l'enregistrement.");
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-2xl space-y-6 px-6">
      {message && (
        <p
          className={`rounded-md px-4 py-2 text-sm ${
            message.toLowerCase().includes("erreur") || message.toLowerCase().includes("échec")
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </p>
      )}

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold text-neutral-800">Connexion Google Calendar</h2>
        {config.connecte ? (
          <>
            <p className="mt-2 text-sm text-emerald-700">
              ✅ Connecté — {config.googleEmailCompte ?? "compte inconnu"}
              {config.connecteA && ` (le ${new Date(config.connecteA).toLocaleDateString("fr-FR")})`}
            </p>
            <a
              href="/api/super-admin/rdv-demo/autoriser"
              className="mt-3 inline-block rounded-md border border-neutral-300 px-4 py-2 text-xs font-medium hover:bg-neutral-50"
            >
              Reconnecter / changer de compte
            </a>
          </>
        ) : !config.variablesGoogleConfigurees ? (
          <p className="mt-2 text-sm text-amber-700">
            ⚠️ GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET ne sont pas encore configurées (voir
            render.yaml) — impossible de se connecter tant que ces variables ne sont pas renseignées.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-neutral-600">Aucun agenda connecté pour l&apos;instant.</p>
            <a
              href="/api/super-admin/rdv-demo/autoriser"
              className="mt-3 inline-block rounded-md bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-700"
            >
              Connecter Google Calendar
            </a>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold text-neutral-800">Créneaux proposés</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="text-xs text-neutral-600">
            Durée (minutes)
            <input
              type="number"
              value={config.dureeCreneauMinutes}
              onChange={(e) => setConfig((c) => ({ ...c, dureeCreneauMinutes: Number(e.target.value) }))}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-neutral-600">
            Ouverture
            <input
              type="time"
              value={config.heureDebut}
              onChange={(e) => setConfig((c) => ({ ...c, heureDebut: e.target.value }))}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-neutral-600">
            Fermeture
            <input
              type="time"
              value={config.heureFin}
              onChange={(e) => setConfig((c) => ({ ...c, heureFin: e.target.value }))}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-neutral-600">Jours ouvrés</p>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5, 6, 0].map((jour) => (
            <button
              key={jour}
              onClick={() => basculerJour(jour)}
              className={`rounded-full px-3 py-1 text-xs ${
                config.joursOuvres.includes(jour) ? "bg-fuchsia-600 text-white" : "border border-neutral-300 text-neutral-600"
              }`}
            >
              {LIBELLE_JOUR[jour]}
            </button>
          ))}
        </div>
        <button
          onClick={enregistrer}
          disabled={envoi}
          className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {envoi ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
