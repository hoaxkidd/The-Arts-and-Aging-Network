import { Prisma, PrismaClient } from '@prisma/client'

type UserCodeDb = Pick<PrismaClient, 'user'> | Prisma.TransactionClient

const SEQ_WIDTH = 3
const MAX_RETRIES = 8

function tokenInitial(token: string): string | null {
  const trimmed = token.trim()
  if (!trimmed) return null
  const first = trimmed.match(/[A-Za-z0-9]/)
  return first ? first[0].toUpperCase() : null
}

export function buildUserCodePrefix(name: string | null | undefined): string {
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .map(tokenInitial)
    .filter((v): v is string => Boolean(v))

  if (parts.length === 0) return 'X'
  if (parts.length === 1) return parts[0]
  return parts.join('')
}

function parseUserCodeSequence(prefix: string, userCode: string | null): number {
  if (!userCode) return 0
  const match = userCode.match(new RegExp(`^${prefix}(\\d+)$`))
  if (!match) return 0
  return parseInt(match[1], 10) || 0
}

export async function generateNextUserCode(db: UserCodeDb, name: string | null | undefined): Promise<string> {
  const prefix = buildUserCodePrefix(name)
  const existing = await db.user.findMany({
    where: { userCode: { startsWith: prefix } },
    select: { userCode: true },
  })

  const maxSeq = existing.reduce((max, row) => {
    const seq = parseUserCodeSequence(prefix, row.userCode)
    return seq > max ? seq : max
  }, 0)

  for (let seq = maxSeq + 1; seq < maxSeq + 10000; seq++) {
    const candidate = `${prefix}${String(seq).padStart(SEQ_WIDTH, '0')}`
    const taken = await db.user.findUnique({ where: { userCode: candidate }, select: { id: true } })
    if (!taken) return candidate
  }

  throw new Error(`Unable to allocate userCode for prefix ${prefix}`)
}

function isUserCodeUniqueError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (error.code !== 'P2002') return false
  const target = (error.meta?.target as string[] | string | undefined) ?? []
  if (Array.isArray(target)) return target.includes('userCode')
  return String(target).includes('userCode')
}

export async function createUserWithGeneratedCode(
  db: UserCodeDb,
  data: Prisma.UserCreateInput,
) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const userCode = await generateNextUserCode(db, typeof data.name === 'string' ? data.name : null)
    try {
      return await db.user.create({
        data: {
          ...data,
          userCode,
        },
      })
    } catch (error) {
      if (isUserCodeUniqueError(error)) continue
      throw error
    }
  }

  throw new Error('Unable to create user with unique userCode after retries')
}

export async function ensureUserCode(db: UserCodeDb, userId: string, name: string | null | undefined): Promise<string> {
  const existing = await db.user.findUnique({ where: { id: userId }, select: { userCode: true } })
  if (!existing) throw new Error('User not found while ensuring userCode')
  if (existing.userCode) return existing.userCode

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const userCode = await generateNextUserCode(db, name)
    try {
      await db.user.update({ where: { id: userId }, data: { userCode } })
      return userCode
    } catch (error) {
      if (isUserCodeUniqueError(error)) continue
      throw error
    }
  }

  throw new Error('Unable to assign userCode after retries')
}

export async function reassignUserCodeForName(db: UserCodeDb, userId: string, name: string | null | undefined): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const userCode = await generateNextUserCode(db, name)
    try {
      await db.user.update({ where: { id: userId }, data: { userCode } })
      return userCode
    } catch (error) {
      if (isUserCodeUniqueError(error)) continue
      throw error
    }
  }

  throw new Error('Unable to reassign userCode after retries')
}

export function shouldReassignUserCode(oldName: string | null | undefined, newName: string | null | undefined): boolean {
  const normalizedNew = (newName || '').trim()
  if (!normalizedNew) return false
  return buildUserCodePrefix(oldName) !== buildUserCodePrefix(normalizedNew)
}
