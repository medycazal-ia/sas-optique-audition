/**
 * Page publique (hors connexion) — accessible par le lien court partagé sur
 * la page d'accueil et par le QR code "RDV DEMO" (voir
 * api/rdv-demo/qrcode). Affiche un agenda de prise de rendez-vous Google
 * Calendar (fonctionnalité "Programme de rendez-vous"), dont l'URL est
 * propre à chaque exploitant du logiciel et n'est donc jamais codée en dur
 * ici — voir GOOGLE_CALENDAR_RDV_URL dans render.yaml. Sans cette variable,
 * la page reste utilisable : elle affiche un message clair plutôt qu'un
 * agenda vide ou une erreur.
 */
export default function RdvDemoPage() {
  const urlAgenda = process.env.GOOGLE_CALENDAR_RDV_URL;

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

      {urlAgenda ? (
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-200 shadow-lg">
          <iframe
            src={urlAgenda}
            title="Prise de rendez-vous FACILOG"
            className="h-[720px] w-full"
            style={{ border: 0 }}
          />
        </div>
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm text-amber-800">
          L&apos;agenda de prise de rendez-vous n&apos;est pas encore configuré. Contactez-nous directement pour
          convenir d&apos;un créneau.
        </div>
      )}
    </main>
  );
}
