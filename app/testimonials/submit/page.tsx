import Link from 'next/link'
import { redirect } from 'next/navigation'
import { submitPublicTestimonial } from '@/app/actions/testimonials'
import { ArrowLeft, Send } from 'lucide-react'

export default async function SubmitTestimonialPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const query = await searchParams

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/testimonials" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back to Testimonials
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-gray-900">Share Your Testimonial</h1>
          <p className="mt-2 text-sm text-gray-600">Your submission will be reviewed before it is published.</p>

          {query.error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{query.error}</p>}
          {query.success && <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{query.success}</p>}

          <form
            action={async (formData) => {
              'use server'
              const result = await submitPublicTestimonial({
                authorName: String(formData.get('authorName') || ''),
                authorRole: String(formData.get('authorRole') || ''),
                organizationName: String(formData.get('organizationName') || ''),
                content: String(formData.get('content') || ''),
                rating: formData.get('rating') ? Number(formData.get('rating')) : undefined,
                programType: String(formData.get('programType') || ''),
                photoUrl: String(formData.get('photoUrl') || ''),
                videoUrl: String(formData.get('videoUrl') || ''),
              })

              if (result?.error) {
                redirect(`/testimonials/submit?error=${encodeURIComponent(result.error)}`)
              }

              redirect('/testimonials/submit?success=Thank%20you!%20Your%20testimonial%20has%20been%20submitted.')
            }}
            className="mt-6 space-y-4"
          >
            <input name="authorName" required placeholder="Your name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input name="authorRole" placeholder="Role (optional)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input name="organizationName" placeholder="Organization (optional)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <textarea name="content" required rows={6} minLength={20} placeholder="Tell us about your experience..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select name="rating" className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">Rating (optional)</option>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
              <select name="programType" className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">Program type</option>
                <option value="MUSIC">Music</option>
                <option value="ART">Art</option>
                <option value="DANCE">Dance</option>
                <option value="THEATRE">Theatre</option>
                <option value="WELLNESS">Wellness</option>
                <option value="OTHER">Other</option>
              </select>
              <input name="photoUrl" type="url" placeholder="Photo URL" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <input name="videoUrl" type="url" placeholder="Video URL (optional)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />

            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              <Send className="h-4 w-4" /> Submit testimonial
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
