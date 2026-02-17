import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local first (Neon/Prod URLs), then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  const password = await hash('Admin123!', 12)
  const user = await prisma.user.upsert({
    where: { email: 'admin@artsandaging.com' },
    update: {},
    create: {
      email: 'admin@artsandaging.com',
      name: 'Super Admin',
      password,
      role: 'ADMIN',
      status: 'ACTIVE',
      bio: 'System Administrator',
      roleData: '{}'
    }
  })
  console.log({ user })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
