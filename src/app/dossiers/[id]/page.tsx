import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculerCompletude, ordonnancesPerimees } from "@/lib/completude";
import { lireSession, sessionEstDirecteurOuPlus, sessionEstSuperAdmin } from "@/lib/auth";
import DossierDetailClient from "./DossierDetailClient";
import BarreUtilisateur from "@/components/BarreUtilisateur";

export const dynamic = "force-dynamic";

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await lireSession();
  const estDirecteur = sessionEstDirecteurOuPlus(session);
  const estSuperAdmin = sessionEstSuperAdmin(session);

  const [personne, propositions, ventesDirectes] = await Promise.all([
    prisma.personne.findUnique({
      where: { id },
      include: {
        documents: { orderBy: { creeA: "desc" } },
        ordonnances: { orderBy: { creeA: "desc" } },
        evenements: { orderBy: { survenuA: "desc" }, take: 30 },
      },
    }),
    prisma.proposition.findMany({
      where: { personneId: id },
      orderBy: { creeA: "desc" },
      include: {
        lignes: true,
        demandes: { orderBy: { creeA: "desc" } },
        commandes: {
          orderBy: { creeA: "desc" },
          include: {
            lignes: { include: { produit: true } },
            livraison: {
              include: {
                facture: { include: { paiements: true, avoirs: true } },
                savs: {
                  orderBy: { creeA: "desc" },
                  include: {
                    commandeLigne: { include: { produit: true } },
                    commandeRemplacement: { include: { lignes: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    // Ventes directes (comptoir, sans devis) : ni propositionId ni savId.
    prisma.commande.findMany({
      where: { personneId: id, propositionId: null, savId: null },
      orderBy: { creeA: "desc" },
      include: {
        lignes: { include: { produit: true } },
        livraison: {
          include: {
            facture: { include: { paiements: true, avoirs: true } },
            savs: {
              orderBy: { creeA: "desc" },
              include: {
                commandeLigne: { include: { produit: true } },
                commandeRemplacement: { include: { lignes: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!personne) {
    notFound();
  }

  // Journal d'événements réservé au rôle DIRECTEUR — on ne renvoie même pas
  // les événements au client si ce n'est pas le cas, plutôt que de se fier
  // uniquement à un masquage côté affichage.
  if (!estDirecteur) {
    personne.evenements = [];
  }

  const completude = calculerCompletude(personne.documents);
  const nbPerimees = ordonnancesPerimees(personne.ordonnances);

  const initiales = `${personne.prenom[0] ?? ""}${personne.nom[0] ?? ""}`.toUpperCase();

  return (
    <main className="flex-1 py-12">
      <div className="mx-auto w-full max-w-3xl px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dossiers" className="text-sm text-neutral-500 hover:underline">
              ← Retour aux dossiers
            </Link>
            <span className="text-neutral-300">·</span>
            <Link href="/" className="text-sm text-neutral-500 hover:underline">
              Accueil
            </Link>
          </div>
          <BarreUtilisateur />
        </div>

        <div className="mt-3 flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-fuchsia-500 text-lg font-bold text-white shadow-md">
            {initiales}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900">
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
          </div>
        </div>
      </div>

      <DossierDetailClient
        personne={personne}
        completude={completude}
        propositions={propositions}
        ventesDirectes={ventesDirectes}
        estDirecteurReel={estDirecteur}
        estSuperAdminReel={estSuperAdmin}
      />
    </main>
  );
}
