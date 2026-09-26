import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NouveauProduitClient from "./NouveauProduitClient";

export const dynamic = "force-dynamic";

export default async function NouveauProduitPage() {
  const [magasins, fournisseurs] = await Promise.all([
    prisma.magasin.findMany({ orderBy: { nom: "asc" } }),
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <div className="flex items-center gap-3">
        <Link href="/produits" className="text-sm text-neutral-500 hover:underline">
          ← Retour au catalogue
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          Accueil
        </Link>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-2xl shadow-md">
          🧾
        </span>
        <h1 className="text-2xl font-extrabold text-neutral-900">Nouveau produit</h1>
      </div>

      <NouveauProduitClient magasins={magasins} fournisseurs={fournisseurs} />
    </main>
  );
}
