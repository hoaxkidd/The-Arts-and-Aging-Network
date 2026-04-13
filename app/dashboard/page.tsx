import Link from "next/link"
import { CalendarDays, ClipboardList, Clock, ArrowRight } from "lucide-react"
import { getEventSignupForms } from "@/app/actions/form-templates"
import { getHomeEventRequests, getHomeEventHistory } from "@/app/actions/booking-requests"

function parseTags(tags: string | null): string[] {
  if (!tags) return []
  try {
    const parsed = JSON.parse(tags)
    if (Array.isArray(parsed)) {
      return parsed.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    }
  } catch {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  }
  return []
}

export default async function ProgramCoordinatorDashboard() {
  const [formsResult, requestsResult, historyResult] = await Promise.all([
    getEventSignupForms(),
    getHomeEventRequests(),
    getHomeEventHistory(),
  ])

  const forms = formsResult.success && formsResult.data ? formsResult.data : []
  const requests = requestsResult.data || []
  const events = historyResult.data || []

  const pendingRequests = requests.filter((request: any) => request.status === "PENDING").length
  const now = new Date()
  const upcomingBookings = events.filter((event: any) => new Date(event.startDateTime) > now).length

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/dashboard/my-bookings?section=requests" className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{pendingRequests}</p>
              <p className="text-xs text-gray-500">Pending Requests</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/my-bookings?section=upcoming" className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{upcomingBookings}</p>
              <p className="text-xs text-gray-500">Upcoming Bookings</p>
            </div>
          </div>
        </Link>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.length > 0 ? (
          forms.map((form: any) => {
            const tags = parseTags(form.tags ?? null).slice(0, 3)
            return (
              <article key={form.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900">{form.title}</h3>
                <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                  {form.description?.trim() || "Fill this booking form and select your preferred dates."}
                </p>

                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <Link
                  href={`/dashboard/requests/new?formTemplateId=${form.id}`}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                >
                  Book This Program
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </article>
            )
          })
        ) : (
          <div className="md:col-span-2 bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
            <p className="text-sm font-medium text-gray-900">No booking programs are available right now.</p>
            <p className="text-xs text-gray-500 mt-1">Please contact the office if you expected booking forms to appear.</p>
          </div>
        )}
      </section>

      <Link href="/dashboard/my-bookings?view=calendar" className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800">
        <Clock className="w-4 h-4" />
        Open My Bookings (Calendar or List)
      </Link>
    </div>
  )
}
