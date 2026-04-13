'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, CircleHelp, XCircle, Loader2 } from 'lucide-react'
import { respondToFacilitatorRequestRsvp } from '@/app/actions/booking-requests'
import { cn } from '@/lib/utils'

type QueueItem = {
  id: string
  status: string
  request: {
    id: string
    customTitle: string | null
    existingEvent: { id: string; title: string } | null
    geriatricHome: { id: string; name: string }
    rsvpDeadlineAt?: string | Date | null
  }
}

export function FacilitatorRequestQueue({ items }: { items: QueueItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const submit = (requestId: string, status: 'YES' | 'NO' | 'MAYBE') => {
    startTransition(async () => {
      const result = await respondToFacilitatorRequestRsvp({ requestId, status })
      if (result.error) {
        alert(result.error)
      }
      router.refresh()
    })
  }

  if (items.length === 0) return null

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <h2 className="text-sm font-semibold text-amber-900 mb-2">Facilitator RSVP Required</h2>
      <div className="space-y-2">
        {items.map((item) => {
          const title = item.request.customTitle || item.request.existingEvent?.title || 'Booking request'
          return (
            <div key={item.id} className="rounded-md border border-amber-200 bg-white p-3">
              <p className="text-sm font-medium text-gray-900">{title}</p>
              <p className="text-xs text-gray-600">{item.request.geriatricHome.name}</p>
              {item.request.rsvpDeadlineAt && (
                <p className="text-[11px] text-gray-500 mt-1">Deadline: {new Date(item.request.rsvpDeadlineAt).toLocaleString()}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => submit(item.request.id, 'YES')}
                  disabled={isPending}
                  className={cn('px-2.5 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-1')}
                >
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Yes
                </button>
                <button
                  onClick={() => submit(item.request.id, 'MAYBE')}
                  disabled={isPending}
                  className="px-2.5 py-1 text-xs font-medium rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <CircleHelp className="w-3 h-3" /> Maybe
                </button>
                <button
                  onClick={() => submit(item.request.id, 'NO')}
                  disabled={isPending}
                  className="px-2.5 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <XCircle className="w-3 h-3" /> No
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
