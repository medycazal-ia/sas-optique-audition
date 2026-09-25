"use client";

import Link from "next/link";
import { useModeDemo } from "@/lib/modeDemo";

/**
 * Cartes Utilisateurs/Super Admin du carrousel d'accueil — honorent la vue
 * simulée du mode démo (jamais plus que le rôle réel, voir modeDemo.ts).
 */
export default function CartesAdmin({
  estDirecteurReel,
  estSuperAdminReel,
  indexDepart,
}: {
  estDirecteurReel: boolean;
  estSuperAdminReel: boolean;
  indexDepart: number;
}) {
  const { estDirecteurAffiche, estSuperAdminAffiche } = useModeDemo(estSuperAdminReel, estDirecteurReel);

  return (
    <>
      {estDirecteurAffiche && (
        <Link
          href="/utilisateurs"
          style={{ animationDelay: `${indexDepart * 60}ms` }}
          className="anim-pop group relative flex h-64 w-64 flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br p-5 text-white shadow-xl transition duration-300 hover:-translate-y-2 hover:shadow-2xl sm:h-72 sm:w-72"
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-600 to-neutral-900" />
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15 transition group-hover:scale-125" />
          <div className="flex items-center justify-between">
            <span className="text-4xl drop-shadow-sm">🧑‍💼</span>
            <span className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
              Directeurs
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">Utilisateurs</h2>
            <p className="mt-1 text-sm text-white/85">Créer et gérer les comptes collaborateur.</p>
          </div>
        </Link>
      )}

      {estSuperAdminAffiche && (
        <Link
          href="/super-admin"
          style={{ animationDelay: `${(indexDepart + 1) * 60}ms` }}
          className="anim-pop group relative flex h-64 w-64 flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br p-5 text-neutral-100 shadow-xl ring-1 ring-amber-400/40 transition duration-300 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(217,164,65,0.35)] sm:h-72 sm:w-72"
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950" />
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-amber-400/10 transition group-hover:scale-125" />
          <div className="flex items-center justify-between">
            <span className="text-4xl drop-shadow-[0_0_12px_rgba(217,164,65,0.6)]">👑</span>
            <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-medium text-amber-200 backdrop-blur-sm">
              Fondateur
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight text-amber-200">Super Admin</h2>
            <p className="mt-1 text-sm text-neutral-400">Au-dessus de tout — visible ici uniquement.</p>
          </div>
        </Link>
      )}
    </>
  );
}
