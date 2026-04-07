import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { DonorsHubClient } from "./DonorsHubClient"
import { Heart } from "lucide-react"

export const revalidate = 60

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
    address: d.address,
    type: d.type,
    tier: d.tier,
    status: d.status,
    isRecurring: d.isRecurring,
    notes: d.notes,
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

  // #region agent log
  fetch('http://127.0.0.1:3010/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7a8fa1'},body:JSON.stringify({sessionId:'7a8fa1',runId:'donors-pre',hypothesisId:'H5',location:'app/admin/donors/page.tsx:DonorsPage',message:'donors page loaded summary',data:{donorCount:serialized.length,donationsWithMethod:serialized.flatMap((d)=>d.donations).filter((x)=>Boolean(x.method)).length,donationsWithCampaign:serialized.flatMap((d)=>d.donations).filter((x)=>Boolean(x.campaign)).length,donationsWithProgramType:serialized.flatMap((d)=>d.donations).filter((x)=>Boolean(x.programType)).length},timestamp:Date.now()})}).catch(()=>{})
  // #endregion

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto pt-4">
        <DonorsHubClient donors={serialized} />
      </div>
    </div>
  )
}
