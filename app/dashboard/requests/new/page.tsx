import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { CustomEventRequestForm } from "@/components/event-requests/CustomEventRequestForm"
import { Calendar, ArrowLeft } from "lucide-react"

export default async function NewCustomEventPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 flex-shrink-0 pb-3 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 -mx-4 px-4 md:-mx-6 md:px-6 -mt-4 pt-4 mb-2">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/requests" 
            className="text-gray-500 hover:text-gray-700 flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Create Custom Event</h1>
            <p className="text-xs text-gray-500">Submit a request for admin approval</p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto">
        <CustomEventRequestForm />
      </div>
    </div>
  )
}
