import { prisma } from '@/lib/prisma'

async function main() {
  console.log('Resetting onboarding status for HOME_ADMIN and BOARD users...\n')

  const result = await prisma.user.updateMany({
    where: {
      role: { in: ['HOME_ADMIN', 'BOARD'] }
    },
    data: {
      onboardingCompletedAt: null,
      onboardingSkipCount: 0
    }
  })

  console.log(`✅ Reset onboarding for ${result.count} users`)
  console.log('\nAffected roles: HOME_ADMIN, BOARD')
  console.log('Fields reset: onboardingCompletedAt = NULL, onboardingSkipCount = 0')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
