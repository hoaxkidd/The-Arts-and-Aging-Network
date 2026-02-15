import { Calendar, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  iconBg: string
  iconColor: string
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor }: StatCardProps) {
  return (
    <div className={cn(STYLES.statsCard, "group")}>
      <div className="flex items-center justify-between">
        <div className={cn(STYLES.statsIcon, iconBg, iconColor)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="mt-4">
        <p className={STYLES.statsValue}>{value}</p>
        <p className={STYLES.statsLabel}>{label}</p>
      </div>
    </div>
  )
}

export function DashboardStats({ stats }: { stats: { upcoming: number, past: number, pending: number, total: number } }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        label="Upcoming Events"
        value={stats.upcoming}
        icon={Calendar}
        iconBg="bg-primary-100"
        iconColor="text-primary-500"
      />
      <StatCard
        label="Pending Requests"
        value={stats.pending}
        icon={Clock}
        iconBg="bg-secondary-100"
        iconColor="text-secondary-500"
      />
      <StatCard
        label="Completed Events"
        value={stats.past}
        icon={CheckCircle}
        iconBg="bg-green-100"
        iconColor="text-green-600"
      />
      <StatCard
        label="Total Engagement"
        value={stats.total}
        icon={TrendingUp}
        iconBg="bg-accent-100"
        iconColor="text-accent-500"
      />
    </div>
  )
}
