import { PrismaClient } from "@prisma/client";

// Évite de recréer un client à chaque hot-reload en dev (limite de connexions Postgres).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
