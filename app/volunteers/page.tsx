import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import {
  Calendar,
  FileText,
  Clock,
  LayoutDashboard,
  ArrowUpRight
} from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { QuickActionHandler } from "@/components/QuickActionHandler"
import { formatDateWords, formatDateShort } from "@/lib/date-utils"

export const revalidate = 60

export default async function VolunteersDashboard() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) redirect("/login")

  // Check volunteer approval status
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, volunteerReviewStatus: true }
  })
  const roles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.role]
  
  if (roles.includes('VOLUNTEER') && user?.volunteerReviewStatus !== 'APPROVED') {
    redirect("/volunteers/onboarding")
  }

  let upcomingEvents: { id: string; title: string; startDateTime: Date }[] = []
  let recentSubmissions: { id: string; status: string; createdAt: Date; template: { title: string } }[] = []

  try {
    const now = new Date()
    upcomingEvents = await prisma.event.findMany({
      where: {
        startDateTime: { gte: now },
      },
      orderBy: { startDateTime: 'asc' },
      take: 3,
      select: {
        id: true,
        title: true,
        startDateTime: true
      }
    })

    recentSubmissions = await prisma.formSubmission.findMany({
      where: { submittedBy: userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        template: {
          select: { title: true }
        }
      }
    })
  } catch (err) {
    logger.serverAction("[VolunteersDashboard] DB error:", err instanceof Error ? err.message : String(err))
  }

  return (
    <div className="h-full flex flex-col">
      <QuickActionHandler />

      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
          <div className="absolute right-0 top-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Ready to Make a Difference?</h2>
                <p className="text-primary-100 text-xs">
                  {formatDateWords(new Date())}
                </p>
              </div>
            </div>
            <Link
              href="/events"
              className="flex items-center gap-1.5 px-4 py-2 bg-secondary-400 text-primary-800 font-semibold rounded-lg hover:bg-secondary-300 transition-colors text-sm"
            >
              Browse Events <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Upcoming Events */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Upcoming Events
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-primary-600">
                      {event.startDateTime.toLocaleDateString('en-US', { month: 'long' })}
                    </span>
                    <span className="text-sm font-bold text-primary-700">
                      {event.startDateTime.getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {event.startDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-400" />
                </Link>
              )) : (
                <div className="p-6 text-center">
                  <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No upcoming events</p>
                  <Link href="/events" className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block">
                    Browse all events
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Form Submissions */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Recent Submissions
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {recentSubmissions.length > 0 ? recentSubmissions.map((submission) => (
                <Link
                  key={submission.id}
                  href="/volunteers/forms?tab=submissions"
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{submission.template.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatDateShort(new Date(submission.createdAt))}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    submission.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    submission.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    submission.status === 'REVIEWED' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {submission.status}
                  </span>
                </Link>
              )) : (
                <div className="p-6 text-center">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No submissions yet</p>
                  <Link href="/volunteers/forms" className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block">
                    Browse forms
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
