import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ListeDossiersPage() {
  const personnes = await prisma.personne.findMany({
    orderBy: { creeA: "desc" },
    include: { _count: { select: { documents: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Dossiers clients</h1>
        <Link
          href="/dossiers/nouveau"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          + Nouveau dossier
        </Link>
      </div>

      {personnes.length === 0 ? (
        <p className="mt-8 text-neutral-600">Aucun dossier pour l&apos;instant.</p>
      ) : (
        <ul className="mt-6 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {personnes.map((personne) => (
            <li key={personne.id}>
              <Link
                href={`/dossiers/${personne.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-neutral-50"
              >
                <div>
                  <p className="font-medium text-neutral-900">
                    {personne.civilite ? `${personne.civilite} ` : ""}
                    {personne.prenom} {personne.nom}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {personne.telephone ?? personne.email ?? "Aucun contact renseigné"}
                  </p>
                </div>
                <span className="text-xs text-neutral-400">
                  {personne._count.documents} pièce(s) · créé le{" "}
                  {new Date(personne.creeA).toLocaleDateString("fr-FR")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
