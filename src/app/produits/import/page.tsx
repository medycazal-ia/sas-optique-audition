import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { lireSession } from "@/lib/auth";
import BarreUtilisateur from "@/components/BarreUtilisateur";
import ImportCsvClient from "./ImportCsvClient";

export const dynamic = "force-dynamic";

export default async function ImportCsvPage() {
  const session = await lireSession();
  const [magasins, moi] = await Promise.all([
    prisma.magasin.findMany({ orderBy: { nom: "asc" } }),
    session ? prisma.utilisateur.findUnique({ where: { id: session.id }, select: { magasinId: true } }) : null,
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/produits" className="text-sm text-neutral-500 hover:underline">
            ← Retour au catalogue
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href="/" className="text-sm text-neutral-500 hover:underline">
            Accueil
          </Link>
        </div>
        <BarreUtilisateur />
      </div>
      <div className="mt-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-teal-500">Produits & catalogue</p>
        <h1 className="text-3xl font-extrabold text-neutral-900">Import / export CSV en masse</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Toutes les colonnes sont optionnelles sauf type, marque, nom, référence et prix public TTC (nécessaires pour
          créer un nouvel article). Une référence déjà connue met à jour le produit existant plutôt que d&apos;en
          créer un doublon.
        </p>
      </div>

      <ImportCsvClient magasins={magasins} magasinParDefautId={moi?.magasinId ?? ""} />
    </main>
  );
}
