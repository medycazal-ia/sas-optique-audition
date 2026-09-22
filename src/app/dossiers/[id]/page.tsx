import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculerCompletude, ordonnancesPerimees } from "@/lib/completude";
import DossierDetailClient from "./DossierDetailClient";

export const dynamic = "force-dynamic";

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const personne = await prisma.personne.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { creeA: "desc" } },
      ordonnances: { orderBy: { creeA: "desc" } },
      evenements: { orderBy: { survenuA: "desc" }, take: 30 },
    },
  });

  if (!personne) {
    notFound();
  }

  const completude = calculerCompletude(personne.documents);
  const nbPerimees = ordonnancesPerimees(personne.ordonnances);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link href="/dossiers" className="text-sm text-neutral-500 hover:underline">
        ← Retour aux dossiers
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
        {personne.civilite ? `${personne.civilite} ` : ""}
        {personne.prenom} {personne.nom}
      </h1>
      <p className="text-sm text-neutral-500">
        Dossier créé le {new Date(personne.creeA).toLocaleDateString("fr-FR")}
        {nbPerimees > 0 && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {nbPerimees} ordonnance(s) périmée(s)
          </span>
        )}
      </p>

      <DossierDetailClient personne={personne} completude={completude} />
    </main>
  );
}
