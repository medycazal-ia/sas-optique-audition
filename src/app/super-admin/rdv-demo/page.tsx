import { notFound } from "next/navigation";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { googleCalendarConfigureEnv } from "@/lib/googleCalendarRdv";
import RdvDemoAdminClient from "./RdvDemoAdminClient";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ connecte?: string; erreur?: string }> };

/**
 * Super Admin > Prise de RDV — connexion de l'agenda Google du fondateur et
 * réglages des créneaux proposés sur la page publique /rdv-demo. Protégée
 * par le préfixe /super-admin du proxy (404 générique sinon).
 */
export default async function RdvDemoAdminPage({ searchParams }: PageProps) {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    notFound();
  }

  const { connecte, erreur } = await searchParams;
  const config = await prisma.configurationRdv.findUnique({ where: { id: "singleton" } });

  const messageInitial = erreur
    ? `Échec de la connexion Google : ${erreur}`
    : connecte
      ? "Agenda Google connecté avec succès."
      : null;

  return (
    <main className="flex flex-1 flex-col py-10">
      <div className="mx-auto w-full max-w-2xl px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Super Admin</p>
        <h1 className="mt-2 text-2xl font-bold text-neutral-900">Prise de RDV — page publique /rdv-demo</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Connectez votre agenda Google pour que la page /rdv-demo (et le QR code &quot;RDV DEMO&quot; de
          l&apos;accueil) affiche vos disponibilités réelles et crée directement le rendez-vous.
        </p>
      </div>

      <RdvDemoAdminClient
        messageInitial={messageInitial}
        config={{
          variablesGoogleConfigurees: googleCalendarConfigureEnv(),
          connecte: Boolean(config?.googleRefreshToken),
          googleEmailCompte: config?.googleEmailCompte ?? null,
          connecteA: config?.connecteA?.toISOString() ?? null,
          connectePar: config?.connectePar ?? null,
          dureeCreneauMinutes: config?.dureeCreneauMinutes ?? 30,
          heureDebut: config?.heureDebut ?? "09:00",
          heureFin: config?.heureFin ?? "18:00",
          joursOuvres: config?.joursOuvres ?? [1, 2, 3, 4, 5],
        }}
      />
    </main>
  );
}
