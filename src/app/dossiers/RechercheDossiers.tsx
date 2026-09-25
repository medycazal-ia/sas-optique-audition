"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Personne } from "@prisma/client";

type ResultatRecherche = Personne & { _count: { documents: number } };

const DEGRADES = [
  "from-orange-400 to-amber-500",
  "from-teal-400 to-emerald-500",
  "from-sky-400 to-indigo-500",
  "from-fuchsia-400 to-pink-500",
  "from-violet-400 to-purple-500",
];

const LONGUEUR_MIN = 3;

export default function RechercheDossiers() {
  const [terme, setTerme] = useState("");
  const [resultats, setResultats] = useState<ResultatRecherche[] | null>(null);
  const [recherche, setRecherche] = useState(false);
  const requeteEnCours = useRef(0);

  useEffect(() => {
    const q = terme.trim();
    if (q.length < LONGUEUR_MIN) {
      setResultats(null);
      setRecherche(false);
      return;
    }

    setRecherche(true);
    const idRequete = ++requeteEnCours.current;
    const minuteur = setTimeout(async () => {
      try {
        const reponse = await fetch(`/api/dossiers?q=${encodeURIComponent(q)}`);
        const data = await reponse.json();
        if (requeteEnCours.current === idRequete) {
          setResultats(data);
          setRecherche(false);
        }
      } catch {
        if (requeteEnCours.current === idRequete) {
          setResultats([]);
          setRecherche(false);
        }
      }
    }, 200);

    return () => clearTimeout(minuteur);
  }, [terme]);

  return (
    <div className="mt-6">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-neutral-400">
          🔍
        </span>
        <input
          value={terme}
          onChange={(e) => setTerme(e.target.value)}
          placeholder="Rechercher par nom, prénom ou numéro de sécurité sociale…"
          autoFocus
          className="w-full rounded-full border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
      </div>

      {terme.trim().length < LONGUEUR_MIN && (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-neutral-300 bg-white/60 p-10 text-center text-neutral-500">
          Tapez au moins {LONGUEUR_MIN} caractères (nom, prénom ou numéro de sécurité sociale) pour retrouver un
          dossier.
        </p>
      )}

      {terme.trim().length >= LONGUEUR_MIN && recherche && resultats === null && (
        <p className="mt-6 text-center text-sm text-neutral-400">Recherche…</p>
      )}

      {terme.trim().length >= LONGUEUR_MIN && resultats !== null && resultats.length === 0 && !recherche && (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-neutral-300 bg-white/60 p-10 text-center text-neutral-500">
          Aucun dossier ne correspond à « {terme.trim()} ».
        </p>
      )}

      {resultats !== null && resultats.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {resultats.map((personne, i) => {
            const initiales = `${personne.prenom[0] ?? ""}${personne.nom[0] ?? ""}`.toUpperCase();
            return (
              <li key={personne.id}>
                <Link
                  href={`/dossiers/${personne.id}`}
                  className="anim-pop flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${DEGRADES[i % DEGRADES.length]} font-bold text-white shadow`}
                  >
                    {initiales}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-neutral-900">
                      {personne.civilite ? `${personne.civilite} ` : ""}
                      {personne.prenom} {personne.nom}
                    </p>
                    <p className="truncate text-sm text-neutral-500">
                      {personne.numeroSecuriteSociale
                        ? `NSS ${personne.numeroSecuriteSociale}`
                        : personne.telephone ?? personne.email ?? "Aucun contact renseigné"}
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-xs text-neutral-400">
                    {personne._count.documents} pièce(s)
                    <br />
                    {new Date(personne.creeA).toLocaleDateString("fr-FR")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
