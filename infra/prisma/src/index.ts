import { PrismaClient } from "@prisma/client";

// Maintient l'instance Prisma en cache pour éviter l'épuisement des connexions en développement HMR
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
