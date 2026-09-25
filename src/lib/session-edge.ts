import { jwtVerify } from "jose";

/**
 * Vérification de jeton de session, isolée dans un module sans dépendance à
 * next/headers ni bcrypt, pour rester utilisable depuis le middleware
 * (runtime edge). auth.ts (usage serveur classique) réexpose la même logique.
 */
export type SessionUtilisateur = {
  id: string;
  email: string;
  nom: string;
  role: "COLLABORATEUR" | "ADMIN";
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
      role: payload.role as "COLLABORATEUR" | "ADMIN",
    };
  } catch {
    return null;
  }
}
