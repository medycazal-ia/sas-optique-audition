import { notFound } from "next/navigation";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MutuellesClient from "./MutuellesClient";

export const dynamic = "force-dynamic";

/**
 * Carte Super Admin > Mutuelles & sécurité sociale — annuaires Mutuelle
 * (AMC, avec identifiants d'accès portail pour automatiser les demandes de
 * prise en charge/paiement) et CaisseAmo (AMO). Même garde d'accès que le
 * reste du Super Admin — ces annuaires portent des identifiants sensibles,
 * jamais exposés en dehors de cette carte.
 */
export default async function MutuellesPage() {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    notFound();
  }

  const [mutuelles, caisses] = await Promise.all([
    prisma.mutuelle.findMany({ orderBy: { nom: "asc" } }),
    prisma.caisseAmo.findMany({ orderBy: { nom: "asc" } }),
  ]);

  return <MutuellesClient mutuelles={mutuelles} caisses={caisses} />;
}
