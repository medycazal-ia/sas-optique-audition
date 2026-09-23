import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formaterPrix } from "@/lib/argent";
import BarreUtilisateur from "@/components/BarreUtilisateur";
import type { Prisma, TypeProduit } from "@prisma/client";

export const dynamic = "force-dynamic";

const EMOJI_TYPE: Record<TypeProduit, string> = {
  MONTURE: "🕶️",
  VERRE: "🔬",
  LENTILLE: "👁️",
  ACCESSOIRE: "🧰",
};

const LIBELLE_TYPE: Record<TypeProduit, string> = {
  MONTURE: "Monture",
  VERRE: "Verre",
  LENTILLE: "Lentille",
  ACCESSOIRE: "Accessoire",
};

const TYPES: TypeProduit[] = ["MONTURE", "VERRE", "LENTILLE", "ACCESSOIRE"];

export default async function CatalogueProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q, type } = await searchParams;

  const where: Prisma.ProduitWhereInput = {};
  if (type && TYPES.includes(type as TypeProduit)) where.type = type as TypeProduit;
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { marque: { contains: q, mode: "insensitive" } },
      { modele: { contains: q, mode: "insensitive" } },
    ];
  }

  const produits = await prisma.produit.findMany({
    where,
    orderBy: [{ marque: "asc" }, { modele: "asc" }],
    include: { stocks: true },
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <div className="flex justify-end">
        <BarreUtilisateur />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-500">Produits & catalogue</p>
          <h1 className="text-3xl font-extrabold text-neutral-900">Catalogue</h1>
        </div>
        <Link
          href="/produits/nouveau"
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-neutral-700"
        >
          + Nouveau produit
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Référence, marque, modèle…"
          className="min-w-[220px] flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm"
        />
        <select name="type" defaultValue={type ?? ""} className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm">
          <option value="">Tous les types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {LIBELLE_TYPE[t]}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          Rechercher
        </button>
      </form>

      {produits.length === 0 ? (
        <p className="mt-10 rounded-2xl border-2 border-dashed border-neutral-300 bg-white/60 p-10 text-center text-neutral-500">
          Aucun produit ne correspond — ou le catalogue est encore vide.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {produits.map((produit, i) => {
            const totalStock = produit.stocks.reduce((somme, s) => somme + s.quantite, 0);
            return (
              <li key={produit.id}>
                <Link
                  href={`/produits/${produit.id}`}
                  className="anim-pop flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 text-2xl shadow">
                    {EMOJI_TYPE[produit.type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-neutral-900">
                      {produit.marque} {produit.modele}
                    </p>
                    <p className="truncate text-sm text-neutral-500">
                      {LIBELLE_TYPE[produit.type]} · réf. {produit.reference}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-neutral-900">{formaterPrix(produit.prixTTC)}</p>
                    <p className={`text-xs ${totalStock > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {totalStock > 0 ? `${totalStock} en stock` : "Rupture"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
