import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BarreUtilisateur from "@/components/BarreUtilisateur";
import ProduitDetailClient from "./ProduitDetailClient";

export const dynamic = "force-dynamic";

export default async function ProduitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [produit, magasins] = await Promise.all([
    prisma.produit.findUnique({
      where: { id },
      include: {
        stocks: { include: { magasin: true }, orderBy: { magasin: { nom: "asc" } } },
        historiquePrix: { orderBy: { effectifA: "desc" } },
      },
    }),
    prisma.magasin.findMany({ orderBy: { nom: "asc" } }),
  ]);

  if (!produit) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
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

      <ProduitDetailClient produit={produit} magasins={magasins} />
    </main>
  );
}
