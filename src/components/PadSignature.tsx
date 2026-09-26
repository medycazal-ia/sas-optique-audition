"use client";

import { useRef, useState } from "react";

/**
 * Capture d'une signature manuscrite au doigt, à la souris ou au stylet —
 * via l'API standard Pointer Events, qui reçoit nativement les événements
 * d'un stylet/tablette graphique (Wacom Intuos et similaires, une fois le
 * pilote du fabricant installé sur le poste) au même titre qu'une souris ou
 * un écran tactile, pression comprise (`event.pressure`). Il n'existe pas
 * d'intégration directe possible depuis une page web avec un pad de
 * signature dédié (Wacom STU, avec son propre écran) : ces boîtiers
 * nécessitent le SDK propriétaire du fabricant, hors de portée d'une
 * application web standard — ce composant couvre le cas réellement
 * atteignable : n'importe quel pointeur (souris, doigt, stylet) sur
 * l'écran/la tablette de l'utilisateur.
 */
export default function PadSignature({
  titre,
  onSigner,
  onFermer,
}: {
  titre: string;
  onSigner: (fichier: File) => void;
  onFermer: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dessineRef = useRef(false);
  const [aDessine, setADessine] = useState(false);
  const [enCours, setEnCours] = useState(false);

  function contexte() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function positionRelative(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function demarrerTrait(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = contexte();
    if (!ctx) return;
    canvasRef.current?.setPointerCapture(e.pointerId);
    dessineRef.current = true;
    const { x, y } = positionRelative(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function continuerTrait(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dessineRef.current) return;
    const ctx = contexte();
    if (!ctx) return;
    const { x, y } = positionRelative(e);
    // La pression d'un stylet (Wacom, etc.) épaissit le trait — 1 par
    // défaut pour une souris/un doigt, qui ne la rapportent pas.
    ctx.lineWidth = 1.5 + (e.pressure || 0.5) * 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!aDessine) setADessine(true);
  }

  function terminerTrait() {
    dessineRef.current = false;
  }

  function effacer() {
    const canvas = canvasRef.current;
    const ctx = contexte();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setADessine(false);
  }

  async function valider() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setEnCours(true);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    setEnCours(false);
    if (!blob) return;
    onSigner(new File([blob], "signature.png", { type: "image/png" }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
        <h3 className="text-sm font-semibold text-neutral-900">{titre}</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Signez ci-dessous avec un stylet (tablette Wacom ou équivalent), le doigt sur un écran tactile, ou la souris.
        </p>
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="mt-3 w-full touch-none rounded-md border border-neutral-300 bg-neutral-50"
          onPointerDown={demarrerTrait}
          onPointerMove={continuerTrait}
          onPointerUp={terminerTrait}
          onPointerLeave={terminerTrait}
        />
        <div className="mt-3 flex items-center justify-between">
          <button onClick={effacer} className="text-xs text-neutral-500 hover:underline">
            Effacer
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onFermer} className="text-xs text-neutral-500 hover:underline">
              Annuler
            </button>
            <button
              onClick={valider}
              disabled={!aDessine || enCours}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {enCours ? "Enregistrement…" : "Valider la signature"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
