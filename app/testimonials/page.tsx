import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { MessageSquareQuote, Star } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PublicTestimonialsPage() {
  const testimonials = await prisma.testimonial.findMany({
    where: { status: 'APPROVED' },
    orderBy: [
      { featured: 'desc' },
      { displayOrder: 'asc' },
      { collectedAt: 'desc' },
    ],
    take: 120,
    select: {
      id: true,
      authorName: true,
      authorRole: true,
      organizationName: true,
      content: true,
      rating: true,
      programType: true,
      collectedAt: true,
      featured: true,
    },
  })

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Community Testimonials</h1>
            <p className="mt-2 text-sm text-gray-600">Stories from participants, families, and partners.</p>
          </div>
          <Link href="/testimonials/submit" className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            <MessageSquareQuote className="h-4 w-4" /> Share your story
          </Link>
        </div>

        {testimonials.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
            No testimonials are published yet. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {testimonials.map((item) => (
              <article key={item.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">{item.authorName}</h2>
                  {item.featured && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">Featured</span>}
                </div>
                <p className="mb-3 text-xs text-gray-500">
                  {[item.authorRole, item.organizationName].filter(Boolean).join(' • ') || 'Community member'}
                </p>
                {item.rating ? (
                  <div className="mb-3 flex items-center gap-1 text-amber-500">
                    {Array.from({ length: item.rating }).map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                ) : null}
                <p className="text-sm leading-relaxed text-gray-700">“{item.content}”</p>
                <div className="mt-4 text-[11px] text-gray-500">
                  {item.programType ? `${item.programType} • ` : ''}
                  {new Date(item.collectedAt).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
