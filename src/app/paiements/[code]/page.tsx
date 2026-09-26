import Link from "next/link";
import PaiementClient from "./PaiementClient";

export const dynamic = "force-dynamic";

/**
 * Page ouverte par le QR "code paiement" d'une demande de prise en charge
 * (voir /api/demandes-mutuelle/:id/code-paiement/qrcode) — ou atteinte en
 * tapant le code à la main sur /paiements. Affiche le montant à rapprocher
 * et permet de le marquer reçu (pseudo tiers payant, voir lib/codePaiement.ts).
 */
export default async function PaiementPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Accueil
      </Link>
      <PaiementClient code={code} />
    </main>
  );
}
