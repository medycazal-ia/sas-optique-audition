import Link from "next/link";

export default function AccueilPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          SAS métier — Optique &amp; Audition
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-neutral-900">Accueil rapide</h1>
        <p className="mt-3 max-w-xl text-neutral-600">
          Une même relation client traverse l&apos;accueil, la santé, la commande et
          la finance sur un dossier unique. Ce premier lot livre le module{" "}
          <strong>Dossier client</strong> — la fondation dont dépendent tous les
          autres modules.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dossiers/nouveau"
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-neutral-400 hover:shadow-md"
        >
          <span className="text-lg font-semibold">+ Nouveau dossier</span>
          <p className="mt-1 text-sm text-neutral-600">
            Créer un dossier en moins de 2 minutes au comptoir.
          </p>
        </Link>
        <Link
          href="/dossiers"
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-neutral-400 hover:shadow-md"
        >
          <span className="text-lg font-semibold">Dossiers existants</span>
          <p className="mt-1 text-sm text-neutral-600">
            Retrouver un dossier client et poursuivre le parcours.
          </p>
        </Link>
      </div>
    </main>
  );
}
