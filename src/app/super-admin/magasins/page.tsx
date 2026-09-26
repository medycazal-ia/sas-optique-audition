import { notFound } from "next/navigation";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MagasinsClient from "./MagasinsClient";

export const dynamic = "force-dynamic";

/**
 * Carte Super Admin > Magasins — création des points de vente (jusque-là
 * impossible depuis l'interface : seule une requête API manuelle le
 * permettait) et affectation de chaque compte à l'un d'eux. Même garde
 * d'accès que le reste du Super Admin.
 */
export default async function MagasinsPage() {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    notFound();
  }

  const [magasins, utilisateurs] = await Promise.all([
    prisma.magasin.findMany({
      orderBy: { nom: "asc" },
      include: { _count: { select: { stocks: true, utilisateurs: true } } },
    }),
    prisma.utilisateur.findMany({
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      select: { id: true, nom: true, prenom: true, email: true, role: true, magasinId: true, actif: true, banni: true },
    }),
  ]);

  return <MagasinsClient magasins={magasins} utilisateurs={utilisateurs} />;
}
