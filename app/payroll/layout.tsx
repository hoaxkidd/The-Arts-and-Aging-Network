import DashboardLayout from "@/components/DashboardLayout"

export default function PayrollLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout role="PAYROLL">
      {children}
    </DashboardLayout>
  )
}
