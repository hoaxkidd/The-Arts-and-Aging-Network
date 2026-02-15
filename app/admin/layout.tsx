import DashboardLayout from "@/components/DashboardLayout"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout role="ADMIN">
      {children}
    </DashboardLayout>
  )
}
