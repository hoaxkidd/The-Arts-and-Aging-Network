import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ExternalLink, FileText } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { requestUserResubmission } from '@/app/actions/form-templates'

type FormSubmissionRow = {
  id: string
  status: string
  createdAt: Date
  template: { id: string; title: string; category: string }
  event: { id: string; title: string } | null
}

type PayrollSubmissionRow = {
  id: string
  status: string
  submittedAt: Date
  form: { id: string; title: string; formType: string; fileUrl: string | null }
}

type Props = {
  userId: string
  canonicalIdentifier: string
  isHomeAdmin: boolean
  recentSubmissions: FormSubmissionRow[]
  payrollSubmissions: PayrollSubmissionRow[]
}

export function AdminUserIntakeFormsPanel({
  userId,
  canonicalIdentifier,
  isHomeAdmin,
  recentSubmissions,
  payrollSubmissions,
}: Props) {
  const formsBase = `/admin/users/${canonicalIdentifier}`

  return (
    <div className="space-y-4 min-w-0">
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className={STYLES.cardHeader}>
          <div className={STYLES.cardTitle}>
            <FileText className="w-4 h-4 text-gray-500 shrink-0" />
            Recent form submissions
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className={STYLES.table}>
            <thead className="bg-gray-50">
              <tr className={STYLES.tableHeadRow}>
                <th className={STYLES.tableHeader}>Form</th>
                <th className={cn(STYLES.tableHeader, 'whitespace-nowrap')}>Category</th>
                <th className={cn(STYLES.tableHeader, 'whitespace-nowrap')}>Status</th>
                <th className={cn(STYLES.tableHeader, 'whitespace-nowrap')}>Submitted</th>
                <th className={cn(STYLES.tableHeader, 'text-right min-w-[200px]')}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className={cn(STYLES.tableCell, 'text-center py-10')}>
                    No form submissions yet.
                  </td>
                </tr>
              ) : (
                recentSubmissions.map((s) => (
                  <tr key={s.id} className={STYLES.tableRow}>
                    <td className={STYLES.tableCell}>
                      <div className="font-medium text-gray-900 min-w-0">{s.template.title}</div>
                      {s.event?.title && (
                        <div className="text-xs text-gray-500 truncate">Event: {s.event.title}</div>
                      )}
                    </td>
                    <td className={STYLES.tableCell}>{s.template.category}</td>
                    <td className={STYLES.tableCell}>{s.status}</td>
                    <td className={cn(STYLES.tableCell, 'whitespace-nowrap')}>
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className={cn(STYLES.tableCell, 'text-right')}>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/admin/form-templates/${s.template.id}/edit`}
                          className={cn(STYLES.btn, STYLES.btnSecondary, STYLES.btnToolbar, 'inline-flex')}
                        >
                          <ExternalLink className={STYLES.btnToolbarIcon} />
                          Template
                        </Link>
                        <Link
                          href="/admin/form-submissions"
                          className={cn(STYLES.btn, STYLES.btnSecondary, STYLES.btnToolbar, 'inline-flex')}
                        >
                          Submissions
                        </Link>
                        <form
                          action={async (fd) => {
                            'use server'
                            const result = await requestUserResubmission(fd)
                            if (result?.error) {
                              redirect(
                                `${formsBase}?formsError=${encodeURIComponent(result.error)}`
                              )
                            }
                            redirect(
                              `${formsBase}?formsMessage=${encodeURIComponent('Resubmission requested')}`
                            )
                          }}
                          className="inline"
                        >
                          <input type="hidden" name="userId" value={userId} />
                          <input
                            type="hidden"
                            name="title"
                            value={`Resubmission requested: ${s.template.title}`}
                          />
                          <input
                            type="hidden"
                            name="message"
                            value={`Please resubmit the form: ${s.template.title}.`}
                          />
                          <input
                            type="hidden"
                            name="actionUrl"
                            value={isHomeAdmin ? '/dashboard/forms' : '/staff/forms'}
                          />
                          <button
                            type="submit"
                            className={cn(STYLES.btn, STYLES.btnSecondary, STYLES.btnToolbar)}
                          >
                            Request resubmission
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className={STYLES.cardHeader}>
          <div className={STYLES.cardTitle}>
            <FileText className="w-4 h-4 text-gray-500 shrink-0" />
            Payroll / compliance forms
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className={STYLES.table}>
            <thead className="bg-gray-50">
              <tr className={STYLES.tableHeadRow}>
                <th className={STYLES.tableHeader}>Form</th>
                <th className={cn(STYLES.tableHeader, 'whitespace-nowrap')}>Type</th>
                <th className={cn(STYLES.tableHeader, 'whitespace-nowrap')}>Status</th>
                <th className={cn(STYLES.tableHeader, 'whitespace-nowrap')}>Submitted</th>
                <th className={cn(STYLES.tableHeader, 'text-right min-w-[200px]')}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payrollSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className={cn(STYLES.tableCell, 'text-center py-10')}>
                    No payroll form submissions yet.
                  </td>
                </tr>
              ) : (
                payrollSubmissions.map((p) => (
                  <tr key={p.id} className={STYLES.tableRow}>
                    <td className={STYLES.tableCell}>
                      <div className="font-medium text-gray-900 min-w-0">{p.form.title}</div>
                      {p.form.fileUrl && (
                        <a
                          href={p.form.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-600 hover:underline truncate block max-w-xs"
                        >
                          View file
                        </a>
                      )}
                    </td>
                    <td className={STYLES.tableCell}>{p.form.formType}</td>
                    <td className={STYLES.tableCell}>{p.status}</td>
                    <td className={cn(STYLES.tableCell, 'whitespace-nowrap')}>
                      {new Date(p.submittedAt).toLocaleString()}
                    </td>
                    <td className={cn(STYLES.tableCell, 'text-right')}>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {p.form.fileUrl && (
                          <a
                            href={p.form.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(STYLES.btn, STYLES.btnSecondary, STYLES.btnToolbar, 'inline-flex')}
                          >
                            <ExternalLink className={STYLES.btnToolbarIcon} />
                            Open
                          </a>
                        )}
                        <form
                          action={async (fd) => {
                            'use server'
                            const result = await requestUserResubmission(fd)
                            if (result?.error) {
                              redirect(
                                `${formsBase}?formsError=${encodeURIComponent(result.error)}`
                              )
                            }
                            redirect(
                              `${formsBase}?formsMessage=${encodeURIComponent('Resubmission requested')}`
                            )
                          }}
                          className="inline"
                        >
                          <input type="hidden" name="userId" value={userId} />
                          <input
                            type="hidden"
                            name="title"
                            value={`Resubmission requested: ${p.form.title}`}
                          />
                          <input
                            type="hidden"
                            name="message"
                            value={`Please complete or resubmit: ${p.form.title}.`}
                          />
                          <input type="hidden" name="actionUrl" value="/payroll/forms" />
                          <button
                            type="submit"
                            className={cn(STYLES.btn, STYLES.btnSecondary, STYLES.btnToolbar)}
                          >
                            Request resubmission
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
