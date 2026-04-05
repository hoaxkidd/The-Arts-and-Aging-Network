import { redirect } from 'next/navigation'

export default function PayrollExpensesRedirectPage() {
  redirect('/payroll/requests')
}
