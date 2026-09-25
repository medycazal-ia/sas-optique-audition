import Link from "next/link";
import BarreUtilisateur from "@/components/BarreUtilisateur";
import RechercheDossiers from "./RechercheDossiers";

export default function ListeDossiersPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex justify-end">
        <BarreUtilisateur />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Dossier client</p>
          <h1 className="text-3xl font-extrabold text-neutral-900">Dossiers</h1>
        </div>
        <Link
          href="/dossiers/nouveau"
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-neutral-700"
        >
          + Nouveau
        </Link>
      </div>

      <RechercheDossiers />
    </main>
  );
}
