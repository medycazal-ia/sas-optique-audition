import Link from "next/link";
import { notFound } from "next/navigation";
import { MODULES, trouverModule } from "@/lib/modules";

export function generateStaticParams() {
  return MODULES.filter((m) => !m.disponible).map((m) => ({ slug: m.slug }));
}

export default async function ApercuModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const module = trouverModule(slug);
  if (!module || module.disponible) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Retour aux modules
      </Link>

      <div className={`anim-pop mt-4 rounded-[28px] bg-gradient-to-br ${module.degrade} p-8 text-white shadow-xl`}>
        <span className="text-5xl">{module.emoji}</span>
        <h1 className="mt-3 text-3xl font-extrabold">{module.titre}</h1>
        <p className="mt-1 text-white/85">{module.accroche}</p>
        <span className="mt-4 inline-block rounded-full bg-black/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
          {module.lot}
        </span>
      </div>

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Objectif</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">{module.objectif}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Périmètre fonctionnel prévu</h2>
        <ul className="mt-3 space-y-2">
          {module.perimetre.map((ligne) => (
            <li key={ligne} className="flex gap-2 text-sm text-neutral-600">
              <span className="text-neutral-300">•</span>
              {ligne}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Ce module n&apos;est pas encore réalisé — détail complet dans{" "}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5">docs/dossier-cadrage.md</code>.
      </p>
    </main>
  );
}
