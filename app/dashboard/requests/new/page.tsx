import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { CustomEventRequestForm } from "@/components/event-requests/CustomEventRequestForm"
import { Calendar } from "lucide-react"

export default async function NewCustomEventPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 pb-3">
        <div className="flex items-center gap-2">
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
        <div className="max-w-2xl">
          <CustomEventRequestForm />
        </div>
      </div>
    </div>
  )
}
