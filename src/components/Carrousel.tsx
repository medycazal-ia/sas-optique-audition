"use client";

import { useCallback, useRef } from "react";

/**
 * Carrousel glissable (glisser à la souris, au trackpad ou au doigt) avec
 * flèches de navigation pour l'accessibilité clavier/souris. Le scroll au
 * doigt/trackpad utilise le scroll-snap natif (.carrousel dans
 * globals.css) ; le glisser-déposer à la souris est géré ici à la main,
 * car un navigateur ne convertit pas nativement un drag souris en
 * défilement horizontal (seuls le trackpad, la molette et le tactile le
 * font). Deux pièges à ne pas réintroduire si ce fichier est retouché :
 * - Écouter le mouvement via `window` (pas `setPointerCapture`) : la
 *   capture de pointeur redirige aussi le `click` final vers l'élément
 *   capturant, donc les liens/boutons à l'intérieur des cartes (ex. une
 *   ligne de proposition) ne reçoivent plus jamais leur clic.
 * - `onDragStart` doit bloquer le drag-and-drop HTML natif : sans lui,
 *   démarrer un glissement depuis un lien déclenche un drag natif qui
 *   interrompt les événements de mouvement après les tout premiers
 *   pixels, plutôt que de faire défiler le carrousel.
 */
export default function Carrousel({ children }: { children: React.ReactNode }) {
  const pisteRef = useRef<HTMLDivElement>(null);
  const etatGlissement = useRef({ actif: false, x: 0, scrollDepart: 0, aBouge: false });

  function faireDefiler(direction: 1 | -1) {
    const piste = pisteRef.current;
    if (!piste) return;
    const largeur = piste.clientWidth * 0.8;
    piste.scrollBy({ left: direction * largeur, behavior: "smooth" });
  }

  // useCallback avec dépendances vides : ces fonctions ne lisent/écrivent
  // que des refs (identité stable), leur propre identité doit donc rester
  // stable elle aussi pour que removeEventListener retrouve exactement la
  // fonction passée à addEventListener, même si le composant se
  // re-rendait pendant un glissement en cours.
  const glisser = useCallback((e: PointerEvent) => {
    const piste = pisteRef.current;
    const etat = etatGlissement.current;
    if (!piste || !etat.actif) return;
    const delta = e.clientX - etat.x;
    if (Math.abs(delta) > 3) etat.aBouge = true;
    piste.scrollLeft = etat.scrollDepart - delta;
  }, []);

  const arreterGlissement = useCallback(() => {
    const piste = pisteRef.current;
    const etat = etatGlissement.current;
    if (!piste || !etat.actif) return;
    etat.actif = false;
    piste.style.scrollSnapType = "";
    window.removeEventListener("pointermove", glisser);
    window.removeEventListener("pointerup", arreterGlissement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glisser]);

  function demarrerGlissement(e: React.PointerEvent<HTMLDivElement>) {
    const piste = pisteRef.current;
    if (!piste || e.pointerType !== "mouse" || e.button !== 0) return;
    etatGlissement.current = { actif: true, x: e.clientX, scrollDepart: piste.scrollLeft, aBouge: false };
    piste.style.scrollSnapType = "none";
    window.addEventListener("pointermove", glisser);
    window.addEventListener("pointerup", arreterGlissement);
  }

  function bloquerClicApresGlissement(e: React.MouseEvent<HTMLDivElement>) {
    if (etatGlissement.current.aBouge) {
      e.preventDefault();
      e.stopPropagation();
      etatGlissement.current.aBouge = false;
    }
  }

  return (
    <div className="relative">
      <div
        ref={pisteRef}
        className="carrousel cursor-grab select-none active:cursor-grabbing"
        onPointerDown={demarrerGlissement}
        onClickCapture={bloquerClicApresGlissement}
        onDragStart={(e) => e.preventDefault()}
      >
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
