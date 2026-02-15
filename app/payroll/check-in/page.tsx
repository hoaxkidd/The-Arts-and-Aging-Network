import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { SimpleCheckIn } from "@/components/payroll/SimpleCheckIn"

export default async function CheckInPage() {
  const session = await auth()
  const prismaClient = prisma as any

  // Get recent check-ins
  const recentLogs = await prismaClient.workLog.findMany({
    where: {
      userId: session?.user?.id,
      status: 'CHECKED_IN'
    },
    orderBy: {
      startTime: 'desc'
    },
    take: 10
  })

  // Format logs for component
  const history = recentLogs.map((log: any) => ({
    id: log.id,
    timestamp: log.startTime,
    action: log.status
  }))

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 pt-4 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto">
          <SimpleCheckIn history={history} />
        </div>
      </div>
    </div>
  )
}
