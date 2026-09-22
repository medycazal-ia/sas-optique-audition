import Link from "next/link";
import Carrousel from "@/components/Carrousel";
import { MODULES } from "@/lib/modules";

export default function AccueilPage() {
  return (
    <main className="flex flex-1 flex-col gap-10 py-12">
      <div className="mx-auto w-full max-w-3xl px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
          SAS métier · Optique &amp; Audition
        </p>
        <h1 className="mt-3 bg-gradient-to-r from-orange-500 via-fuchsia-500 to-indigo-500 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl">
          Un seul dossier, tout le parcours
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-neutral-600">
          Accueil, santé, produit, mutuelle, commande, facturation, SAV — 9 cartes,
          un même dossier client. Glissez pour explorer chaque module.
        </p>
      </div>

      <Carrousel>
        {MODULES.map((module, i) => (
          <Link
            key={module.slug}
            href={module.href}
            style={{ animationDelay: `${i * 60}ms` }}
            className="anim-pop group relative flex h-64 w-64 flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br p-5 text-white shadow-xl transition duration-300 hover:-translate-y-2 hover:shadow-2xl sm:h-72 sm:w-72"
          >
            <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${module.degrade}`} />
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15 transition group-hover:scale-125" />

            <div className="flex items-center justify-between">
              <span className="text-4xl drop-shadow-sm">{module.emoji}</span>
              {!module.disponible && (
                <span className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
                  Bientôt
                </span>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold leading-tight">{module.titre}</h2>
              <p className="mt-1 text-sm text-white/85">{module.accroche}</p>
              <p className="mt-3 text-xs font-medium text-white/70">{module.lot}</p>
            </div>
          </Link>
        ))}
      </Carrousel>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 sm:flex-row sm:justify-center">
        <Link
          href="/dossiers/nouveau"
          className="rounded-full bg-neutral-900 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-neutral-700"
        >
          + Nouveau dossier
        </Link>
        <Link
          href="/dossiers"
          className="rounded-full border-2 border-neutral-900 bg-white px-6 py-3 text-center text-sm font-semibold text-neutral-900 transition hover:scale-105 hover:bg-neutral-50"
        >
          Voir les dossiers existants
        </Link>
      </div>
    </main>
  );
}
