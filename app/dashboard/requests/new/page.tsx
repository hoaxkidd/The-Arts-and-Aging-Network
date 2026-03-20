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
      <div className="flex-1 min-h-0 overflow-auto">
        <CustomEventRequestForm />
      </div>
    </div>
  )
}
