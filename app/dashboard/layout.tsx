import DashboardLayout from "@/components/DashboardLayout"

export default function HomeDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout role="HOME_ADMIN">
      {children}
    </DashboardLayout>
  )
}
