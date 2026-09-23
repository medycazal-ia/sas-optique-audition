"use client";

import { useRef } from "react";

/**
 * Carrousel glissable (glisser à la souris, au trackpad ou au doigt) avec
 * flèches de navigation pour l'accessibilité clavier/souris. Utilise le
 * scroll-snap natif (.carrousel dans globals.css) plutôt qu'une librairie —
 * léger et fluide sur tactile comme au comptoir.
 */
export default function Carrousel({ children }: { children: React.ReactNode }) {
  const pisteRef = useRef<HTMLDivElement>(null);

  function faireDefiler(direction: 1 | -1) {
    const piste = pisteRef.current;
    if (!piste) return;
    const largeur = piste.clientWidth * 0.8;
    piste.scrollBy({ left: direction * largeur, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div ref={pisteRef} className="carrousel">
        {children}
      </div>
      <button
        type="button"
        onClick={() => faireDefiler(-1)}
        aria-label="Précédent"
        className="absolute left-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-lg shadow-lg ring-1 ring-black/5 transition hover:scale-110 hover:bg-white sm:flex"
      >
        ←
      </button>
      <button
        type="button"
        onClick={() => faireDefiler(1)}
        aria-label="Suivant"
        className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-lg shadow-lg ring-1 ring-black/5 transition hover:scale-110 hover:bg-white sm:flex"
      >
        →
      </button>
    </div>
  );
}
