import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { lireSession } from "@/lib/auth";
import ScanProduitClient from "./ScanProduitClient";

export const dynamic = "force-dynamic";

/**
 * Page ouverte par le QR code d'un article (voir /api/produits/:id/qrcode) —
 * volontairement optimisée mobile/tablette : gros boutons +/- et validation
 * immédiate, plutôt que le formulaire complet de la fiche produit. "Appareil
 * autorisé" = être connecté sur cet appareil, comme pour le reste de
 * l'application — aucun mécanisme d'appairage séparé.
 */
export default async function ScanProduitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await lireSession();

  const [produit, magasins, moi] = await Promise.all([
    prisma.produit.findUnique({
      where: { id },
      include: { stocks: { include: { magasin: true } } },
    }),
    prisma.magasin.findMany({ orderBy: { nom: "asc" } }),
    session ? prisma.utilisateur.findUnique({ where: { id: session.id }, select: { magasinId: true } }) : null,
  ]);

  if (!produit) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-4 py-8">
      <Link href={`/produits/${id}`} className="text-sm text-neutral-500 hover:underline">
        ← Fiche produit complète
      </Link>
      <ScanProduitClient produit={produit} magasins={magasins} magasinParDefautId={moi?.magasinId ?? ""} />
    </main>
  );
}
