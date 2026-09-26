import { notFound } from "next/navigation";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SocieteClient from "./SocieteClient";

export const dynamic = "force-dynamic";

const ID_SINGLETON = "singleton";

/**
 * Carte Super Admin > Société — fiche de l'entité juridique acheteuse du
 * logiciel (un seul enregistrement, voir modèle Prisma Societe). Sert
 * d'identité par défaut sur les documents générés. Même garde d'accès que
 * le reste du Super Admin.
 */
export default async function SocietePage() {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    notFound();
  }

  const societe = await prisma.societe.findUnique({ where: { id: ID_SINGLETON } });

  return <SocieteClient societe={societe} />;
}
