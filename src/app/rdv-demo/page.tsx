import { prisma } from "@/lib/prisma";
import RdvDemoClient from "./RdvDemoClient";

export const dynamic = "force-dynamic";

/**
 * Page publique (hors connexion) — accessible par le lien court partagé sur
 * la page d'accueil et par le QR code "RDV DEMO" (voir
 * api/rdv-demo/qrcode). Réservation "maison" (voir lib/googleCalendarRdv.ts
 * et RdvDemoClient) : Google ne permettant pas de créer un "Programme de
 * rendez-vous" par API, on construit la même chose nous-mêmes au-dessus de
 * l'API Google Calendar standard, une fois l'agenda du fondateur connecté
 * (voir /super-admin/rdv-demo). Sans connexion, affiche un message clair
 * plutôt qu'un sélecteur vide.
 */
export default async function RdvDemoPage() {
  const config = await prisma.configurationRdv.findUnique({ where: { id: "singleton" } });
  const configure = Boolean(config?.googleRefreshToken);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-10 sm:px-6">
      <div className="w-full max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">FACILOG</p>
        <h1 className="mt-2 bg-gradient-to-r from-orange-500 via-fuchsia-500 to-indigo-500 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
          Réservez votre démo
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 sm:text-base">
          Choisissez un créneau qui vous convient — un échange de 20 à 30 minutes pour découvrir FACILOG
          appliqué à votre magasin d&apos;optique ou d&apos;audioprothèse.
        </p>
      </div>

      {configure ? (
        <RdvDemoClient />
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm text-amber-800">
          La prise de rendez-vous n&apos;est pas encore configurée. Contactez-nous directement pour convenir
          d&apos;un créneau.
        </div>
      )}
    </main>
  );
}
