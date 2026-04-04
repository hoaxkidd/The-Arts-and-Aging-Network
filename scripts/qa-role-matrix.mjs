#!/usr/bin/env node

const baseUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

const accounts = [
  {
    email: 'facvol@artsandaging.com',
    description: 'primary FACILITATOR, secondary VOLUNTEER',
    expectedLanding: '/facilitator',
    quickLinks: ['/facilitator', '/volunteers', '/staff/inbox'],
  },
  {
    email: 'payvol@artsandaging.com',
    description: 'primary PAYROLL, secondary VOLUNTEER',
    expectedLanding: '/payroll',
    quickLinks: ['/payroll', '/volunteers', '/staff/inbox'],
  },
  {
    email: 'boardonly@artsandaging.com',
    description: 'BOARD only (exclusive)',
    expectedLanding: '/board',
    quickLinks: ['/board', '/staff/inbox'],
  },
]

function full(path) {
  return `${baseUrl}${path}`
}

console.log('\nRole Matrix QA Quick Guide\n')
console.log(`Base URL: ${baseUrl}`)
console.log('Seed command: npm run db:seed')
console.log('Password for seeded QA users: TestPass123!\n')

for (const account of accounts) {
  console.log(`- ${account.email}`)
  console.log(`  Role set: ${account.description}`)
  console.log(`  Expected login landing: ${full(account.expectedLanding)}`)
  console.log('  Quick links:')
  for (const link of account.quickLinks) {
    console.log(`    - ${full(link)}`)
  }
  console.log('')
}

console.log('Admin QA controls:')
console.log(`- User management list: ${full('/admin/users')}`)
console.log('- Open each QA user and verify:')
console.log('  - Role Assignments panel')
console.log('  - Set Primary role action')
console.log('  - Add/Remove secondary role actions')
console.log('  - Volunteer Review Status quick actions')
console.log('  - Role Feature Quick Links\n')

console.log('BOARD exclusivity checks:')
console.log('- Attempt to add BOARD to facvol/payvol -> should fail')
console.log('- Attempt to add any non-BOARD role to boardonly -> should fail\n')

console.log('Regression commands:')
console.log('- npm run test:run')
console.log('- npm run lint')
console.log('- npm run build')
console.log('- npm run test:coverage\n')
