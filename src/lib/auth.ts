import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import {
  NOM_COOKIE_SESSION,
  verifierJetonSession,
  sessionEstSuperAdmin,
  sessionEstDirecteurOuPlus,
  type SessionUtilisateur,
} from "@/lib/session-edge";

export type { SessionUtilisateur };
export { sessionEstSuperAdmin, sessionEstDirecteurOuPlus };

const DUREE_SESSION_SECONDES = 60 * 60 * 12; // 12h — poste de comptoir partagé, pas de session infinie.

function cleSecrete() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET manquant ou trop court (>=16 caractères) — voir .env.example.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hacherMotDePasse(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, 12);
}

export async function verifierMotDePasse(motDePasse: string, hash: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, hash);
}

export async function creerSession(utilisateur: SessionUtilisateur) {
  const jeton = await new SignJWT({ ...utilisateur })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DUREE_SESSION_SECONDES}s`)
    .sign(cleSecrete());

  const magasin = await cookies();
  magasin.set(NOM_COOKIE_SESSION, jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DUREE_SESSION_SECONDES,
  });
}

export async function lireSession(): Promise<SessionUtilisateur | null> {
  const magasin = await cookies();
  const jeton = magasin.get(NOM_COOKIE_SESSION)?.value;
  if (!jeton) return null;
  return verifierJetonSession(jeton);
}

export async function detruireSession() {
  const magasin = await cookies();
  magasin.delete(NOM_COOKIE_SESSION);
}
