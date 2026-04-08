import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import {
  TestimonialsHubClient,
  type TestimonialRow,
} from "@/components/admin/TestimonialsHubClient"

export const dynamic = 'force-dynamic'

export default async function TestimonialsPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const testimonials = await prisma.testimonial.findMany({
    include: {
      event: {
        select: { title: true }
      },
      collector: {
        select: { name: true }
      }
    },
    orderBy: [
      { featured: 'desc' },
      { collectedAt: 'desc' }
    ]
  })

  const serialized: TestimonialRow[] = testimonials.map((t) => ({
    id: t.id,
    authorName: t.authorName,
    authorRole: t.authorRole,
    content: t.content,
    rating: t.rating,
    status: t.status,
    featured: t.featured,
    collectedAt: t.collectedAt.toISOString(),
    event: t.event ? { title: t.event.title } : null,
    collector: t.collector ? { name: t.collector.name } : null,
  }))

  return <TestimonialsHubClient testimonials={serialized} />
}
