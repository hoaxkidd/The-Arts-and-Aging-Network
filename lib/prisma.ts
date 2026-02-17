import { PrismaClient } from '@prisma/client'
import path from 'path'

// Ensure we use the same DB as seed: load .env.local first (Next.js loads .env, but this guarantees Neon URLs)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = require('dotenv')
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
  } catch {
    // dotenv optional; Next.js env may already be set
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
