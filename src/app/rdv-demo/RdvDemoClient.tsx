"use client";

import { useEffect, useMemo, useState } from "react";

type Creneau = { debut: string; fin: string };

/**
 * Réservation "maison" (voir lib/googleCalendarRdv.ts) : liste les créneaux
 * disponibles regroupés par jour, laisse choisir un jour puis une heure,
 * recueille les coordonnées du visiteur, puis réserve — revalidé côté
 * serveur juste avant la création de l'événement.
 */
export default function RdvDemoClient() {
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [jourChoisi, setJourChoisi] = useState<string | null>(null);
  const [creneauChoisi, setCreneauChoisi] = useState<Creneau | null>(null);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirme, setConfirme] = useState(false);

  useEffect(() => {
    fetch("/api/rdv-demo/creneaux")
      .then((r) => r.json())
      .then((d) => setCreneaux(d.creneaux ?? []))
      .catch(() => setCreneaux([]));
  }, []);

  const parJour = useMemo(() => {
    const groupes = new Map<string, Creneau[]>();
    for (const c of creneaux ?? []) {
      const cle = new Date(c.debut).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle)!.push(c);
    }
    return groupes;
  }, [creneaux]);

  async function reserver() {
    if (!creneauChoisi) return;
    setEnvoi(true);
    setErreur(null);
    const reponse = await fetch("/api/rdv-demo/reserver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...creneauChoisi, prenom, nom, email, telephone, message }),
    });
    const data = await reponse.json().catch(() => ({}));
    setEnvoi(false);
    if (reponse.ok) {
      setConfirme(true);
    } else {
      setErreur(data.erreur ?? "Échec de la réservation.");
    }
  }

  if (confirme) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center text-emerald-800">
        <p className="text-2xl">✅</p>
        <p className="mt-2 font-semibold">Rendez-vous confirmé !</p>
        <p className="mt-1 text-sm">
          Une invitation vient d&apos;être envoyée à {email} — à très bientôt.
        </p>
      </div>
    );
  }

  if (creneaux === null) {
    return <p className="text-sm text-neutral-500">Chargement des disponibilités…</p>;
  }

  if (creneaux.length === 0) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm text-amber-800">
        Aucun créneau disponible pour le moment — contactez-nous directement pour convenir d&apos;un rendez-vous.
      </div>
    );
  }

  return (
    <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-600">1. Choisissez un jour</p>
        <div className="flex flex-col gap-2">
          {[...parJour.keys()].map((jour) => (
            <button
              key={jour}
              onClick={() => {
                setJourChoisi(jour);
                setCreneauChoisi(null);
              }}
              className={`rounded-lg border px-4 py-2 text-left text-sm capitalize transition ${
                jourChoisi === jour
                  ? "border-fuchsia-500 bg-fuchsia-50 font-semibold text-fuchsia-800"
                  : "border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {jour}
            </button>
          ))}
        </div>

        {jourChoisi && (
          <>
            <p className="mb-2 mt-4 text-sm font-semibold text-neutral-600">2. Choisissez une heure</p>
            <div className="flex flex-wrap gap-2">
              {parJour.get(jourChoisi)!.map((c) => (
                <button
                  key={c.debut}
                  onClick={() => setCreneauChoisi(c)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    creneauChoisi?.debut === c.debut
                      ? "border-fuchsia-500 bg-fuchsia-500 text-white"
                      : "border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  {new Date(c.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {creneauChoisi && (
        <div className="rounded-2xl border border-neutral-200 p-5 shadow-sm">
          <p className="text-sm font-semibold text-neutral-600">3. Vos coordonnées</p>
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Prénom"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Nom"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Téléphone (optionnel)"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message (optionnel)"
              rows={2}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          {erreur && <p className="mt-2 text-sm text-red-600">{erreur}</p>}
          <button
            onClick={reserver}
            disabled={envoi || !prenom.trim() || !nom.trim() || !email.trim()}
            className="mt-4 w-full rounded-full bg-gradient-to-r from-orange-500 via-fuchsia-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105 disabled:opacity-50"
          >
            {envoi ? "Réservation…" : "Confirmer le rendez-vous"}
          </button>
        </div>
      )}
    </div>
  );
}
