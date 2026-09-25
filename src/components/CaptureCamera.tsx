"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Prise de photo directe (webcam d'ordinateur ou caméra de téléphone/
 * tablette) pour capturer un document sans passer par un scanner dédié ni
 * le sélecteur de fichiers — utile au comptoir avec juste un téléphone ou
 * un ordinateur portable équipé d'une webcam. Préfère la caméra arrière
 * (`facingMode: "environment"`) sur mobile, plus adaptée à photographier un
 * document qu'une caméra frontale. Jamais mise en miroir : contrairement à
 * un selfie, un document doit rester lisible tel quel.
 */
export default function CaptureCamera({
  titre,
  onCapture,
  onFermer,
}: {
  titre: string;
  onCapture: (fichier: File) => void;
  onFermer: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    let annule = false;

    async function demarrer() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErreur("Caméra non disponible sur cet appareil ou ce navigateur.");
        return;
      }
      try {
        const flux = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (annule) {
          flux.getTracks().forEach((piste) => piste.stop());
          return;
        }
        streamRef.current = flux;
        if (videoRef.current) {
          videoRef.current.srcObject = flux;
          await videoRef.current.play();
        }
        setPret(true);
      } catch {
        if (!annule) {
          setErreur(
            "Impossible d'accéder à la caméra — vérifiez l'autorisation demandée par le navigateur, ou utilisez « Scanner / téléverser » à la place.",
          );
        }
      }
    }

    demarrer();
    return () => {
      annule = true;
      streamRef.current?.getTracks().forEach((piste) => piste.stop());
    };
  }, []);

  function capturer() {
    const video = videoRef.current;
    if (!video || !pret) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const contexte = canvas.getContext("2d");
    if (!contexte) return;
    contexte.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onFermer}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <p className="mb-2 text-sm font-semibold text-neutral-900">📷 {titre}</p>

        {erreur ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erreur}</p>
        ) : (
          <div className="overflow-hidden rounded-lg bg-neutral-900">
            <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-contain" />
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onFermer} className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:underline">
            Annuler
          </button>
          {!erreur && (
            <button
              onClick={capturer}
              disabled={!pret}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              📸 Capturer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
