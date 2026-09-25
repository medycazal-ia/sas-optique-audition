import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BarreUtilisateur from "@/components/BarreUtilisateur";
import PropositionDetailClient from "./PropositionDetailClient";

export const dynamic = "force-dynamic";

export default async function PropositionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const proposition = await prisma.proposition.findUnique({
    where: { id },
    include: {
      personne: { select: { id: true, prenom: true, nom: true } },
      lignes: { include: { produit: true }, orderBy: { creeA: "asc" } },
      remplace: { select: { id: true, statut: true, creeA: true } },
      remplaceePar: { select: { id: true, statut: true, creeA: true } },
    },
  });

  if (!proposition) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dossiers/${proposition.personne.id}`} className="text-sm text-neutral-500 hover:underline">
            ← Retour au dossier de {proposition.personne.prenom} {proposition.personne.nom}
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href="/" className="text-sm text-neutral-500 hover:underline">
            Accueil
          </Link>
        </div>
        <BarreUtilisateur />
      </div>

      <PropositionDetailClient proposition={proposition} />
    </main>
  );
}
