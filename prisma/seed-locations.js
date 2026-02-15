// const { PrismaClient } = require('@prisma/client')

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const locations = [
    { name: 'Pleasant View Manor', address: '123 Oak St, St. John\'s, NL', type: 'HOME' },
    { name: 'Harbour Breeze Care', address: '45 Harbour Dr, St. John\'s, NL', type: 'HOME' },
    { name: 'Maplewood Senior Living', address: '88 Maple Ave, Mount Pearl, NL', type: 'HOME' },
    { name: 'Arts & Aging Office', address: '49 James Lane, St. John\'s, NL', type: 'OFFICE' },
  ]

  for (const loc of locations) {
    const exists = await prisma.location.findFirst({ where: { name: loc.name } })
    if (!exists) {
      await prisma.location.create({ data: loc })
      console.log(`Created location: ${loc.name}`)
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())
