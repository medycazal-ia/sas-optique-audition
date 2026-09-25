import { notFound } from "next/navigation";
import { lireSession, sessionEstSuperAdmin } from "@/lib/auth";
import { listerUtilisateurs } from "@/lib/utilisateurs";
import SuperAdminClient from "./SuperAdminClient";

export const dynamic = "force-dynamic";

/**
 * Carte Super Admin — au-dessus de tout, y compris des directeurs. Le
 * proxy (src/proxy.ts) bloque déjà cette route en 404 pour quiconque n'est
 * pas reconnu super admin ; on revérifie ici (défense en profondeur) plutôt
 * que de faire confiance à une seule couche.
 */
export default async function SuperAdminPage() {
  const session = await lireSession();
  if (!sessionEstSuperAdmin(session)) {
    notFound();
  }

  const utilisateurs = await listerUtilisateurs(true);

  return <SuperAdminClient utilisateurs={utilisateurs} sessionId={session!.id} sessionEmail={session!.email} />;
}
