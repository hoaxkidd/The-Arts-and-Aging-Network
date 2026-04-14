'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, RotateCcw, Settings2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { updateBookingsAccessAllowedRoles } from '@/app/actions/bookings-access-policy'
import { notify } from '@/lib/notify'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import {
  BOOKING_ACCESS_CANDIDATE_ROLES,
  BOOKING_ACCESS_ROLE_LABELS,
  DEFAULT_BOOKINGS_ACCESS_POLICY_CONFIG,
} from '@/lib/bookings-access-policy'

type BookingsAccessPolicyPanelProps = {
  allowedRoles: string[]
  lastUpdatedAt?: string | null
  lastUpdatedBy?: string | null
}

const PROTECTED_ROUTES = ['/bookings', '/staff/bookings', '/facilitator/bookings', '/board/bookings', '/partner/bookings']

function formatUpdatedLabel(iso: string | null | undefined): string {
  if (!iso) return 'Not updated yet'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Not updated yet'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function BookingsAccessPolicyPanel({
  allowedRoles,
  lastUpdatedAt,
  lastUpdatedBy,
}: BookingsAccessPolicyPanelProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(allowedRoles)
  const [isPending, startTransition] = useTransition()

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((entry) => entry !== role) : [...prev, role]
    )
  }

  const resetDefaults = () => {
    setSelectedRoles([...DEFAULT_BOOKINGS_ACCESS_POLICY_CONFIG.allowedRoles])
  }

  const save = () => {
    startTransition(async () => {
      const result = await updateBookingsAccessAllowedRoles(selectedRoles)
      if (result.error) {
        notify.error({ title: 'Update failed', description: result.error })
        return
      }
      notify.success({ title: 'Bookings access policy updated' })
    })
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary-50 p-2 text-primary-700">
            <Settings2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-900">Bookings Access Policy</h2>
            <p className="mt-1 text-xs text-gray-600">
              Configure which roles can access organization booking routes. Program Coordinators are permanently redirected to <code>/dashboard/my-bookings</code>.
            </p>
          </div>
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-right text-xs text-gray-600">
          <p>
            Last updated: <span className="font-medium text-gray-800">{formatUpdatedLabel(lastUpdatedAt)}</span>
          </p>
          <p>
            Updated by: <span className="font-medium text-gray-800">{lastUpdatedBy || 'System'}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[minmax(160px,1fr)_96px] bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          <span>Role</span>
          <span className="text-right">Access</span>
        </div>
        {BOOKING_ACCESS_CANDIDATE_ROLES.map((role) => {
          const checked = selectedRoles.includes(role)
          return (
            <label
              key={role}
              className={cn(
                'grid cursor-pointer grid-cols-[minmax(160px,1fr)_96px] items-center border-t px-3 py-2.5 text-sm first:border-t-0',
                checked ? 'bg-primary-50/60 text-primary-900' : 'bg-white text-gray-700'
              )}
            >
              <span className="font-medium">{BOOKING_ACCESS_ROLE_LABELS[role]}</span>
              <span className="flex justify-end">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRole(role)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600"
                />
              </span>
            </label>
          )
        })}
        <div className="grid grid-cols-[minmax(160px,1fr)_96px] items-center border-t border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <span className="font-medium">Program Coordinator (HOME_ADMIN)</span>
          <span className="flex justify-end text-xs font-semibold uppercase tracking-wide">Always Blocked</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <p className="mb-2 flex items-start gap-2 font-medium">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Protected routes covered by this policy
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PROTECTED_ROUTES.map((route) => (
              <span key={route} className="rounded bg-white px-2 py-1 text-[11px] text-blue-800 border border-blue-200">
                {route}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="mb-1 flex items-start gap-2 font-medium">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Permanent home-account safeguard
          </p>
          <p>
            Home accounts are blocked from organization booking feeds and are always redirected to their own booking workspace.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={resetDefaults}
          disabled={isPending}
          className={cn(STYLES.btn, STYLES.btnSecondary, 'inline-flex items-center gap-2')}
        >
          <RotateCcw className="h-4 w-4" />
          Reset defaults
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className={cn(STYLES.btn, STYLES.btnPrimary, 'inline-flex items-center gap-2')}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save policy
        </button>
      </div>
    </section>
  )
}
