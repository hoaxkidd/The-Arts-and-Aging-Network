import { PrismaClient } from '@prisma/client'

// Next.js loads .env/.env.local automatically in dev; Vercel injects env in production.
// No Node-only APIs (path, process.cwd) here so this file stays Edge-compatible for middleware.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
