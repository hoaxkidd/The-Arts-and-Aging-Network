import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DonorsHubClient } from "./DonorsHubClient"
import { Heart } from "lucide-react"

export default async function DonorsPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const donors = await prisma.donor.findMany({
    include: {
      donations: {
        orderBy: { donationDate: 'desc' },
        select: {
          id: true,
          amount: true,
          currency: true,
          type: true,
          method: true,
          campaign: true,
          programType: true,
          receiptNumber: true,
          receiptIssued: true,
          donationDate: true,
          notes: true,
        },
      },
    },
    orderBy: { totalDonated: 'desc' },
  })

  const serialized = donors.map((d) => ({
    id: d.id,
    name: d.name,
    email: d.email,
    phone: d.phone,
    type: d.type,
    tier: d.tier,
    status: d.status,
    isRecurring: d.isRecurring,
    totalDonated: d.totalDonated,
    donationCount: d.donationCount,
    firstDonation: d.firstDonation?.toISOString() ?? null,
    lastDonation: d.lastDonation?.toISOString() ?? null,
    donations: d.donations.map((don) => ({
      id: don.id,
      amount: don.amount,
      currency: don.currency,
      type: don.type,
      method: don.method,
      campaign: don.campaign,
      programType: don.programType,
      receiptNumber: don.receiptNumber,
      receiptIssued: don.receiptIssued,
      donationDate: don.donationDate.toISOString(),
      notes: don.notes,
    })),
  }))

  return (
    <div className="h-full flex flex-col">
      <header className="flex-shrink-0 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Donors</h1>
            <p className="text-xs text-gray-500">
              View donor and organization details, payment methods, campaigns, and donation history
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <DonorsHubClient donors={serialized} />
      </div>
    </div>
  )
}
