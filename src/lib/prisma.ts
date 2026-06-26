import { PrismaClient } from "@prisma/client";

// In dev, Next.js hot-reloads and would otherwise create a new
// PrismaClient on every reload, exhausting DB connections.
// Caching it on globalThis prevents that.

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
