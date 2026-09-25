import { PrismaClient } from "@prisma/client";

// Évite de recréer un client à chaque hot-reload en dev (limite de connexions Postgres).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Chiffrement en transit obligatoire dès qu'on quitte le développement local
// (voir docs/conformite-hds.md). Un avertissement plutôt qu'un blocage : la
// démo sur un hébergeur qui gère le TLS en dehors de la chaîne de connexion
// (proxy interne) ne doit pas être cassée, mais l'oubli doit être visible.
if (process.env.NODE_ENV === "production") {
  const url = process.env.DATABASE_URL ?? "";
  const dejaChiffree = /sslmode=require|sslmode=verify/.test(url) || url.includes("localhost");
  if (!dejaChiffree) {
    console.warn(
      "[sécurité] DATABASE_URL en production sans sslmode=require — le trafic vers PostgreSQL " +
        "n'est peut-être pas chiffré. Ajouter ?sslmode=require à la chaîne de connexion avant " +
        "d'y faire transiter de vraies données de santé. Voir docs/conformite-hds.md.",
    );
  }
}
