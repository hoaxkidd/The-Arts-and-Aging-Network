import DashboardLayout from "@/components/DashboardLayout"

export default function VolunteersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout role="VOLUNTEER">
      {children}
    </DashboardLayout>
  )
}
