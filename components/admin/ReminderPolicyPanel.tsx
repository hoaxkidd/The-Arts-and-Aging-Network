'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Edit3, Loader2, Save, X } from 'lucide-react'
import {
  updateHomeAdminReminderOffsets,
  updateReminderCronEndpoint,
  updateReminderCronFrequency,
  updateStaffReminderOffsets,
} from '@/app/actions/email-reminders'
import { notify } from '@/lib/notify'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import {
  ALLOWED_CRON_ENDPOINTS,
  ALLOWED_CRON_FREQUENCIES,
  type ReminderPolicyConfig,
} from '@/lib/reminder-policy'

type ReminderPolicyPanelProps = {
  config: ReminderPolicyConfig
}

type ModalType = 'home' | 'staff' | 'endpoint' | 'frequency' | null

export function ReminderPolicyPanel({ config }: ReminderPolicyPanelProps) {
  const router = useRouter()
  const [openModal, setOpenModal] = useState<ModalType>(null)
  const [isPending, startTransition] = useTransition()
  const [homeOffsets, setHomeOffsets] = useState<string[]>(config.homeAdminOffsets.map(String))
  const [staffOffsets, setStaffOffsets] = useState<string[]>(config.staffOffsets.map(String))
  const [cronEndpoint, setCronEndpoint] = useState(config.cronEndpoint)
  const [cronFrequency, setCronFrequency] = useState(config.cronFrequency)

  const saveHome = () => {
    startTransition(async () => {
      const values = homeOffsets.map((value) => Number(value))
      const result = await updateHomeAdminReminderOffsets(values)
      if (result.error) {
        notify.error({ title: 'Update failed', description: result.error })
        return
      }
      setOpenModal(null)
      notify.success({ title: 'Home admin reminders updated' })
      router.refresh()
    })
  }

  const saveStaff = () => {
    startTransition(async () => {
      const values = staffOffsets.map((value) => Number(value))
      const result = await updateStaffReminderOffsets(values)
      if (result.error) {
        notify.error({ title: 'Update failed', description: result.error })
        return
      }
      setOpenModal(null)
      notify.success({ title: 'Staff reminders updated' })
      router.refresh()
    })
  }

  const saveEndpoint = () => {
    startTransition(async () => {
      const result = await updateReminderCronEndpoint(cronEndpoint)
      if (result.error) {
        notify.error({ title: 'Update failed', description: result.error })
        return
      }
      setOpenModal(null)
      notify.success({ title: 'Cron endpoint updated' })
      router.refresh()
    })
  }

  const saveFrequency = () => {
    startTransition(async () => {
      const result = await updateReminderCronFrequency(cronFrequency)
      if (result.error) {
        notify.error({ title: 'Update failed', description: result.error })
        return
      }
      setOpenModal(null)
      notify.success({ title: 'Cron frequency updated' })
      router.refresh()
    })
  }

  return (
    <div className="flex-shrink-0 mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-2">Automatic Email Reminders</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li className="flex items-center justify-between gap-2">
              <span>Home admins receive reminders {config.homeAdminOffsets.join(' and ')} days before events</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border border-blue-200 bg-white px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                onClick={() => setOpenModal('home')}
              >
                <Edit3 className="h-3 w-3" /> Edit
              </button>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Staff members receive reminders {config.staffOffsets.join(' and ')} days before events</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border border-blue-200 bg-white px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                onClick={() => setOpenModal('staff')}
              >
                <Edit3 className="h-3 w-3" /> Edit
              </button>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>
                Reminders are processed automatically by the cron job at:{' '}
                <code className="bg-blue-100 px-1 rounded">{config.cronEndpoint}</code>
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border border-blue-200 bg-white px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                onClick={() => setOpenModal('endpoint')}
              >
                <Edit3 className="h-3 w-3" /> Edit
              </button>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Configure the cron job to run {config.cronFrequency.toLowerCase()} for optimal delivery</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border border-blue-200 bg-white px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                onClick={() => setOpenModal('frequency')}
              >
                <Edit3 className="h-3 w-3" /> Edit
              </button>
            </li>
          </ul>
        </div>
      </div>

      {openModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenModal(null)} />
          <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {openModal === 'home' && 'Edit home admin reminder days'}
                {openModal === 'staff' && 'Edit staff reminder days'}
                {openModal === 'endpoint' && 'Edit cron endpoint'}
                {openModal === 'frequency' && 'Edit cron frequency'}
              </h3>
              <button
                type="button"
                onClick={() => setOpenModal(null)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {openModal === 'home' || openModal === 'staff' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(openModal === 'home' ? homeOffsets : staffOffsets).map((value, index) => (
                    <div key={index}>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Reminder {index + 1} (days)</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={value}
                        onChange={(event) => {
                          const next = event.target.value
                          if (openModal === 'home') {
                            const copy = [...homeOffsets]
                            copy[index] = next
                            setHomeOffsets(copy)
                          } else {
                            const copy = [...staffOffsets]
                            copy[index] = next
                            setStaffOffsets(copy)
                          }
                        }}
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpenModal(null)} className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={openModal === 'home' ? saveHome : saveStaff}
                    className={cn('inline-flex items-center gap-1 rounded bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-60')}
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </button>
                </div>
              </div>
            ) : null}

            {openModal === 'endpoint' ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Cron endpoint</label>
                  <select
                    value={cronEndpoint}
                    onChange={(event) => setCronEndpoint(event.target.value)}
                    className={cn(STYLES.select, 'h-10 w-full rounded-md border border-gray-300 bg-white text-sm')}
                  >
                    {ALLOWED_CRON_ENDPOINTS.map((endpoint) => (
                      <option key={endpoint} value={endpoint}>{endpoint}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpenModal(null)} className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={saveEndpoint}
                    className="inline-flex items-center gap-1 rounded bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </button>
                </div>
              </div>
            ) : null}

            {openModal === 'frequency' ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Cron frequency</label>
                  <select
                    value={cronFrequency}
                    onChange={(event) => setCronFrequency(event.target.value)}
                    className={cn(STYLES.select, 'h-10 w-full rounded-md border border-gray-300 bg-white text-sm')}
                  >
                    {ALLOWED_CRON_FREQUENCIES.map((frequency) => (
                      <option key={frequency} value={frequency}>{frequency}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpenModal(null)} className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={saveFrequency}
                    className="inline-flex items-center gap-1 rounded bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
