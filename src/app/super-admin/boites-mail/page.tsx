import { notFound } from "next/navigation";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BoitesMailClient from "./BoitesMailClient";

export const dynamic = "force-dynamic";

/**
 * Carte Super Admin > Boîtes mail tiers payant — référence des boîtes mail
 * surveillées pour la recherche automatique des accords/refus de prise en
 * charge. La connexion réelle à chaque boîte (OAuth Gmail/Microsoft 365) se
 * configure dans Make (make.com), pas ici — cette page documente quelle
 * boîte couvre quelles plateformes/mutuelles, et relie chaque boîte à son
 * scénario Make pour la relance manuelle.
 */
export default async function BoitesMailPage() {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    notFound();
  }

  const boites = await prisma.boiteMailTiersPayant.findMany({ orderBy: { nom: "asc" } });
  return <BoitesMailClient boites={boites} />;
}
