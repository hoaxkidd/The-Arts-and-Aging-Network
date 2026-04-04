import { PrismaClient } from '@prisma/client'

// Next.js loads .env/.env.local automatically in dev; Vercel injects env in production.
// No Node-only APIs (path, process.cwd) here so this file stays Edge-compatible for middleware.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function resolveDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL?.trim() || process.env.DATABASE_URL_UNPOOLED?.trim()
  if (!rawUrl) return undefined

  try {
    const url = new URL(rawUrl)
    const isPostgres = url.protocol === 'postgres:' || url.protocol === 'postgresql:'

    if (isPostgres) {
      if (!url.searchParams.get('sslmode')) {
        url.searchParams.set('sslmode', 'require')
      }

      if (!url.searchParams.get('connect_timeout')) {
        url.searchParams.set('connect_timeout', '15')
      }
    }

    return url.toString()
  } catch {
    return rawUrl
  }
}

const resolvedDatabaseUrl = resolveDatabaseUrl()

const prismaClient = resolvedDatabaseUrl
  ? new PrismaClient({ datasources: { db: { url: resolvedDatabaseUrl } } })
  : new PrismaClient()

export const prisma = globalForPrisma.prisma || prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
