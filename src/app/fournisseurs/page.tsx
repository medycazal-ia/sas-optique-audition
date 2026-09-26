import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BarreUtilisateur from "@/components/BarreUtilisateur";
import FournisseursClient from "./FournisseursClient";

export const dynamic = "force-dynamic";

/**
 * Annuaire des fournisseurs — nom, contact, SAV, conditions commerciales,
 * remarques. Chaque produit du catalogue peut être rattaché à l'un d'eux
 * (voir la fiche produit) : le lien reste interne, jamais imprimé sur un
 * devis/facture, mais transmis avec la marque sur les demandes de prise en
 * charge mutuelle/sécurité sociale.
 */
export default async function FournisseursPage() {
  const fournisseurs = await prisma.fournisseur.findMany({
    orderBy: { nom: "asc" },
    include: { _count: { select: { produits: true } } },
  });

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
      <div className="mt-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-teal-500">Produits & catalogue</p>
        <h1 className="text-3xl font-extrabold text-neutral-900">Fournisseurs</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Annuaire interne (jamais imprimé sur les devis/factures — seule la marque l&apos;est). Nécessaire, avec la
          marque, aux demandes de prise en charge mutuelle/sécurité sociale.
        </p>
      </div>

      <FournisseursClient fournisseurs={fournisseurs} />
    </main>
  );
}
