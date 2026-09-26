import { notFound } from "next/navigation";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ModelesDocumentsClient from "./ModelesDocumentsClient";

export const dynamic = "force-dynamic";

/**
 * Carte Super Admin > Modèles de documents — "un espace pour configurer
 * ces documents à sa guise, sauvegarder et switcher" (Facture, Devis
 * normalisé, Devis non normalisé, Accord tiers payant). Même garde d'accès
 * que le reste du Super Admin (voir src/app/super-admin/page.tsx).
 */
export default async function ModelesDocumentsPage() {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    notFound();
  }

  const modeles = await prisma.modeleDocument.findMany({ orderBy: [{ type: "asc" }, { creeA: "desc" }] });

  return <ModelesDocumentsClient modeles={modeles} />;
}
