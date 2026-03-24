import { prisma } from '@/lib/prisma'

const INV_PREFIX = 'INV'
const SEQ_WIDTH = 3

function parseInviteCodeSequence(inviteCode: string | null): number {
  if (!inviteCode) return 0
  const match = inviteCode.match(new RegExp(`^${INV_PREFIX}(\\d+)$`))
  if (!match) return 0
  return parseInt(match[1], 10) || 0
}

export async function generateNextInviteCode(): Promise<string> {
  const existing = await prisma.invitation.findMany({
    where: { inviteCode: { startsWith: INV_PREFIX } },
    select: { inviteCode: true },
    orderBy: { inviteCode: 'desc' },
    take: 1,
  })

  let maxSeq = 0
  if (existing.length > 0) {
    maxSeq = parseInviteCodeSequence(existing[0].inviteCode)
  }

  const nextSeq = maxSeq + 1
  return `${INV_PREFIX}${String(nextSeq).padStart(SEQ_WIDTH, '0')}`
}
