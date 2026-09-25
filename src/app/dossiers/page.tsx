import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BarreUtilisateur from "@/components/BarreUtilisateur";

export const dynamic = "force-dynamic";

const DEGRADES = [
  "from-orange-400 to-amber-500",
  "from-teal-400 to-emerald-500",
  "from-sky-400 to-indigo-500",
  "from-fuchsia-400 to-pink-500",
  "from-violet-400 to-purple-500",
];

export default async function ListeDossiersPage() {
  const personnes = await prisma.personne.findMany({
    orderBy: { creeA: "desc" },
    include: { _count: { select: { documents: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex justify-end">
        <BarreUtilisateur />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Dossier client</p>
          <h1 className="text-3xl font-extrabold text-neutral-900">Tous les dossiers</h1>
        </div>
        <Link
          href="/dossiers/nouveau"
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-neutral-700"
        >
          + Nouveau
        </Link>
      </div>

      {personnes.length === 0 ? (
        <p className="mt-10 rounded-2xl border-2 border-dashed border-neutral-300 bg-white/60 p-10 text-center text-neutral-500">
          Aucun dossier pour l&apos;instant — créez le premier au comptoir en moins de 2 minutes.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {personnes.map((personne, i) => {
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
                      {personne.telephone ?? personne.email ?? "Aucun contact renseigné"}
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
    </main>
  );
}
