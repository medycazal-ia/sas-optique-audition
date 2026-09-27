import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  LIBELLES_MATIERE_MONTURE_BESOIN,
  LIBELLES_STYLE_BESOIN,
  LIBELLES_TRAITEMENT_VERRE_BESOIN,
  LIBELLES_VISION_BESOIN,
  produitsSuggeresPourBesoins,
  type BesoinsExprimes,
  type MatiereMontureBesoin,
  type StyleBesoin,
  type TraitementVerreBesoin,
  type VisionBesoin,
} from "@/lib/besoinsExprimes";
import AjouterProduitBouton from "./AjouterProduitBouton";

export const dynamic = "force-dynamic";

/**
 * Document de recommandations issu de la carte Audit — pensé pour être
 * ouvert dans la popup dédiée (voir SyntheseBesoin dans DossierDetailClient.tsx) :
 * présente la synthèse et les besoins exprimés, et propose directement les
 * produits du catalogue correspondants pour composer le devis.
 */
export default async function AuditResultatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const personne = await prisma.personne.findUnique({ where: { id } });
  if (!personne) {
    notFound();
  }

  const besoins: BesoinsExprimes = {
    vision: personne.visionBesoin as VisionBesoin | null,
    traitementsVerre: personne.traitementsVerreBesoin as TraitementVerreBesoin[],
    matiereMonture: personne.matiereMontureBesoin as MatiereMontureBesoin | null,
    style: personne.styleBesoin as StyleBesoin[],
  };
  const { verres, montures } = await produitsSuggeresPourBesoins(besoins);

  const chips: string[] = [
    ...(besoins.vision ? [LIBELLES_VISION_BESOIN[besoins.vision]] : []),
    ...besoins.traitementsVerre.map((t) => LIBELLES_TRAITEMENT_VERRE_BESOIN[t]),
    ...(besoins.matiereMonture ? [LIBELLES_MATIERE_MONTURE_BESOIN[besoins.matiereMonture]] : []),
    ...besoins.style.map((s) => LIBELLES_STYLE_BESOIN[s]),
  ];

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="text-xl font-extrabold text-neutral-900">Synthèse du besoin &amp; recommandations</h1>

      {chips.length === 0 ? (
        <p className="mt-4 text-sm text-amber-700">Aucun besoin exprimé enregistré pour l&apos;instant — complétez d&apos;abord la carte Audit du dossier.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1">
          {chips.map((c) => (
            <span key={c} className="rounded-full bg-fuchsia-100 px-2 py-1 text-xs font-medium text-fuchsia-800">
              {c}
            </span>
          ))}
        </div>
      )}

      {personne.syntheseBesoin && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-neutral-50 p-4 text-sm text-neutral-700">{personne.syntheseBesoin}</p>}

      <section className="mt-6">
        <h2 className="font-semibold text-neutral-900">Verres suggérés</h2>
        {verres.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500">Aucun verre correspondant trouvé dans le catalogue.</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200">
            {verres.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3 text-sm">
                <span>
                  {p.marque} {p.modele}
                </span>
                <AjouterProduitBouton personneId={personne.id} produitId={p.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-semibold text-neutral-900">Montures suggérées</h2>
        {montures.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500">Aucune monture correspondante trouvée dans le catalogue.</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200">
            {montures.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3 text-sm">
                <span>
                  {p.marque} {p.modele}
                </span>
                <AjouterProduitBouton personneId={personne.id} produitId={p.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs text-neutral-400">
        Recherche textuelle sur le catalogue existant — pas un filtre garanti (le catalogue n&apos;a pas de champs dédiés pour ces critères).
      </p>
    </main>
  );
}
