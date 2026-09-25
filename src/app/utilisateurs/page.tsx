import { redirect } from "next/navigation";
import Link from "next/link";
import { lireSession, sessionEstDirecteurOuPlus } from "@/lib/auth";
import { listerUtilisateurs } from "@/lib/utilisateurs";
import BarreUtilisateur from "@/components/BarreUtilisateur";
import UtilisateursClient from "./UtilisateursClient";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage() {
  const session = await lireSession();
  if (!sessionEstDirecteurOuPlus(session)) {
    redirect("/");
  }

  const utilisateurs = await listerUtilisateurs(false);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Accueil
        </Link>
        <BarreUtilisateur />
      </div>
      <div className="mt-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">Réservé aux directeurs</p>
        <h1 className="text-3xl font-extrabold text-neutral-900">Utilisateurs</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Créez et gérez les comptes collaborateur et directeur — activation, désactivation, bannissement.
        </p>
      </div>

      <UtilisateursClient utilisateursInitiaux={utilisateurs} sessionId={session!.id} />
    </main>
  );
}
