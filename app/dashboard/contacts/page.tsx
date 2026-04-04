import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { PersonnelManager } from "@/components/dashboard/PersonnelManager"
import { Users } from "lucide-react"
import { safeJsonParse } from "@/lib/utils"

export const revalidate = 60

export default async function ContactsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const home = await prisma.geriatricHome.findUnique({
    where: { userId: session.user.id }
  })

  if (!home) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0">
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Setup Required</h3>
              <p className="text-gray-500 mt-1 mb-4">Please complete your facility profile to access contacts.</p>
              <a href="/dashboard/profile" className="text-primary-600 font-medium hover:underline">
                  Go to Profile Setup
              </a>
          </div>
        </div>
      </div>
    )
  }

  // Parse additional contacts from JSON
  const additionalContacts = safeJsonParse(home.additionalContacts, [])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <PersonnelManager
            home={{
              id: home.id,
              name: home.name,
              contactName: home.contactName,
              contactPosition: home.contactPosition,
              contactEmail: home.contactEmail,
              contactPhone: home.contactPhone,
              useCustomNotificationEmail: home.useCustomNotificationEmail,
              notificationEmail: home.notificationEmail,
              additionalContacts
            }}
          />
        </div>
      </div>
    </div>
  )
}
