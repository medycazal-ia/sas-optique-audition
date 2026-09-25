import { jwtVerify } from "jose";

/**
 * Vérification de jeton de session, isolée dans un module sans dépendance à
 * next/headers ni bcrypt, pour rester utilisable depuis le middleware
 * (runtime edge). auth.ts (usage serveur classique) réexpose la même logique.
 */
export type RoleUtilisateur = "COLLABORATEUR" | "DIRECTEUR" | "SUPER_ADMIN";

export type SessionUtilisateur = {
  id: string;
  email: string;
  nom: string;
  role: RoleUtilisateur;
};

export const NOM_COOKIE_SESSION = "session";

function cleSecrete() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET manquant ou trop court (>=16 caractères) — voir .env.example.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function verifierJetonSession(jeton: string): Promise<SessionUtilisateur | null> {
  try {
    const { payload } = await jwtVerify(jeton, cleSecrete());
    return {
      id: payload.id as string,
      email: payload.email as string,
      nom: payload.nom as string,
      role: payload.role as RoleUtilisateur,
    };
  } catch {
    return null;
  }
}

/**
 * Reconnaissance super admin par email, indépendante du rôle stocké en
 * base — variable d'environnement `SUPER_ADMIN_EMAILS` (liste d'emails
 * séparés par des virgules), réglable uniquement depuis le tableau de bord
 * Render (jamais depuis l'application). Volontairement redondante avec le
 * rôle SUPER_ADMIN en base (attribué à la main, en accès direct SQL) : les
 * deux mécanismes sont indépendants, pour ne jamais dépendre d'un seul
 * moyen d'accès en cas de souci avec l'un ou l'autre.
 */
export function emailEstSuperAdminParEnv(email: string | null | undefined): boolean {
  if (!email) return false;
  const liste = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return liste.includes(email.trim().toLowerCase());
}

/** Vrai si la session est reconnue super admin, par l'un ou l'autre mécanisme. */
export function sessionEstSuperAdmin(session: SessionUtilisateur | null | undefined): boolean {
  if (!session) return false;
  return session.role === "SUPER_ADMIN" || emailEstSuperAdminParEnv(session.email);
}

/** Vrai pour DIRECTEUR et au-dessus (SUPER_ADMIN a accès à tout ce qu'un DIRECTEUR a). */
export function sessionEstDirecteurOuPlus(session: SessionUtilisateur | null | undefined): boolean {
  if (!session) return false;
  return session.role === "DIRECTEUR" || sessionEstSuperAdmin(session);
}
