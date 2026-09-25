"use client";

import Link from "next/link";
import BarreUtilisateur from "@/components/BarreUtilisateur";
import { useModeDemo, type VueDemo } from "@/lib/modeDemo";
import { IDENTIFIANTS_DEMO, CLE_AUTOFILL_CONNEXION } from "@/lib/identifiantsDemo";

/**
 * Barre du hub : identité + liens directs Utilisateurs/Super Admin +
 * bascule "mode démo" pour prévisualiser instantanément la vue d'un rôle
 * moins privilégié (jamais l'inverse) sans se déconnecter. Purement
 * cosmétique — voir src/lib/modeDemo.ts.
 */
export default function BarreModeDemo({
  estDirecteurReel,
  estSuperAdminReel,
}: {
  estDirecteurReel: boolean;
  estSuperAdminReel: boolean;
}) {
  const { vue, definirVue, estDirecteurAffiche, estSuperAdminAffiche } = useModeDemo(
    estSuperAdminReel,
    estDirecteurReel,
  );

  if (!estDirecteurReel && !estSuperAdminReel) return null;

  function ouvrirConnexionDemo() {
    if (vue === "reel") return;
    try {
      window.sessionStorage.setItem(CLE_AUTOFILL_CONNEXION, JSON.stringify(IDENTIFIANTS_DEMO[vue]));
    } catch {
      // sessionStorage indisponible (navigation privée stricte, etc.) — le
      // nouvel onglet retombera simplement sur le formulaire vide.
    }
    // Volontairement sans "noopener" : c'est justement ce lien d'ouverture
    // qui permet au nouvel onglet d'hériter une copie du sessionStorage de
    // celui-ci (même origine, /connexion) pour préremplir le formulaire —
    // voir CLE_AUTOFILL_CONNEXION dans lib/identifiantsDemo.ts.
    window.open("/connexion", "_blank");
  }

  const options: { valeur: VueDemo; libelle: string }[] = [
    { valeur: "reel", libelle: estSuperAdminReel ? "Vue réelle (Super Admin)" : "Vue réelle (Directeur)" },
    ...(estSuperAdminReel ? [{ valeur: "directeur" as VueDemo, libelle: "Vue simulée : Directeur" }] : []),
    { valeur: "collaborateur" as VueDemo, libelle: "Vue simulée : Collaborateur" },
  ];

  return (
    <div className="mb-6 flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <BarreUtilisateur />
        {estDirecteurAffiche && (
          <Link
            href="/utilisateurs"
            className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:scale-105 hover:bg-neutral-700"
          >
            🧑‍💼 Utilisateurs
          </Link>
        )}
        {estSuperAdminAffiche && (
          <Link
            href="/super-admin"
            className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-xs font-bold text-neutral-950 shadow-sm transition hover:scale-105"
          >
            👑 Super Admin
          </Link>
        )}
      </div>

      {options.length > 1 && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            {vue !== "reel" && (
              <span className="rounded-full bg-fuchsia-100 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-700">
                🎬 Mode démo actif
              </span>
            )}
            <select
              value={vue}
              onChange={(e) => definirVue(e.target.value as VueDemo)}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-600"
            >
              {options.map((o) => (
                <option key={o.valeur} value={o.valeur}>
                  {o.libelle}
                </option>
              ))}
            </select>
          </div>

          {vue !== "reel" && (
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={ouvrirConnexionDemo}
                className="rounded-full bg-fuchsia-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:scale-105 hover:bg-fuchsia-700"
              >
                🚀 Se connecter en {vue === "directeur" ? "Directeur" : "Collaborateur"} démo (nouvel onglet, prérempli)
              </button>
              <p className="text-[11px] text-fuchsia-700">
                Identifiants : <span className="font-mono font-semibold">{IDENTIFIANTS_DEMO[vue].email}</span> /{" "}
                <span className="font-mono font-semibold">{IDENTIFIANTS_DEMO[vue].motDePasse}</span>
                {" — "}
                <Link href="/utilisateurs" className="underline hover:text-fuchsia-900">
                  à créer d&apos;abord si besoin
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
