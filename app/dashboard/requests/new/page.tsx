import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { CustomEventRequestForm } from "@/components/booking-requests/CustomEventRequestForm"

export default async function NewCustomEventPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="mx-auto w-full max-w-5xl px-2 pb-4 md:px-4">
          <CustomEventRequestForm />
        </div>
      </div>
    </div>
  )
}
