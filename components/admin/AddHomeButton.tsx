'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Plus, X } from 'lucide-react'
import { createAdminHome } from '@/app/actions/home-management'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

export function AddHomeButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createAdminHome(formData)
      if (result?.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      router.refresh()
      if (result?.homeId) {
        router.push(`/admin/homes/${result.homeId}`)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(STYLES.btn, STYLES.btnPrimary, 'text-sm')}
      >
        <Plus className="w-4 h-4" /> Add Home
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Add Home</h2>
                  <p className="text-xs text-gray-500">Create a home and placeholder HOME_ADMIN account</p>
                </div>
              </div>
              <button type="button" className="rounded p-1 text-gray-500 hover:bg-gray-100" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={handleSubmit} className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Home/Organization *</label>
                  <input name="name" required className={STYLES.input} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Contact Name *</label>
                  <input name="contactName" required className={STYLES.input} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Position</label>
                  <input name="contactPosition" className={STYLES.input} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Email *</label>
                  <input name="contactEmail" type="email" required className={STYLES.input} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Phone *</label>
                  <input name="contactPhone" required className={STYLES.input} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Address *</label>
                  <input name="address" required className={STYLES.input} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">City, Province</label>
                  <input name="cityProvince" className={STYLES.input} placeholder="Winnipeg, MB" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Postal Code</label>
                  <input name="postalCode" className={STYLES.input} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">LTC or PCH</label>
                  <input name="type" className={STYLES.input} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Region</label>
                  <input name="region" className={STYLES.input} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Contacted</label>
                  <input name="contacted" className={STYLES.input} placeholder="Yes / No" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">2nd Contact</label>
                  <input name="secondContact" className={STYLES.input} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">2nd Email/Phone</label>
                  <input name="secondEmailPhone" className={STYLES.input} />
                </div>
              </div>

              {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className={cn(STYLES.btn, STYLES.btnSecondary)}>
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className={cn(STYLES.btn, STYLES.btnPrimary, isPending && 'opacity-70')}>
                  {isPending ? 'Creating...' : 'Create Home'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
