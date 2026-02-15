import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Quote, Star, CheckCircle, Clock, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

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

  const stats = {
    total: testimonials.length,
    approved: testimonials.filter(t => t.status === 'APPROVED').length,
    pending: testimonials.filter(t => t.status === 'PENDING').length,
    featured: testimonials.filter(t => t.featured).length
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Testimonials</h1>
        <p className="text-sm text-gray-500">Manage testimonials and success stories</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-4">
          <p className="text-xs text-green-600 uppercase">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-lg border border-yellow-200 p-4">
          <p className="text-xs text-yellow-600 uppercase">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-blue-200 p-4">
          <p className="text-xs text-blue-600 uppercase">Featured</p>
          <p className="text-2xl font-bold text-blue-600">{stats.featured}</p>
        </div>
      </div>

      {/* Testimonials List */}
      <div className="flex-1 min-h-0 overflow-auto space-y-3">
        {testimonials.map((testimonial) => (
          <div key={testimonial.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3 flex-1">
                <Quote className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">{testimonial.authorName}</span>
                    {testimonial.authorRole && (
                      <span className="text-xs text-gray-500">• {testimonial.authorRole}</span>
                    )}
                    {testimonial.rating && (
                      <div className="flex items-center gap-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{testimonial.content}</p>
                  {testimonial.event && (
                    <p className="text-xs text-gray-500">Related to: {testimonial.event.title}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {testimonial.featured && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    Featured
                  </span>
                )}
                <span className={cn(
                  "px-2 py-1 text-xs font-medium rounded flex items-center gap-1",
                  testimonial.status === 'APPROVED' && "bg-green-100 text-green-700",
                  testimonial.status === 'PENDING' && "bg-yellow-100 text-yellow-700",
                  testimonial.status === 'REJECTED' && "bg-red-100 text-red-700"
                )}>
                  {testimonial.status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                  {testimonial.status === 'PENDING' && <Clock className="w-3 h-3" />}
                  {testimonial.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                  {testimonial.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
