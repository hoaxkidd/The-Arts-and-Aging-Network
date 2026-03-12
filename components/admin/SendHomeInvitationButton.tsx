'use client'

import { useState, useTransition } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { sendHomeInvitation } from '@/app/actions/invitation'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

export function SendHomeInvitationButton({
  homeId,
  compact = false,
}: {
  homeId: string
  compact?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const handleSend = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await sendHomeInvitation(homeId)
      if (result?.error) {
        setMessage(result.error)
        return
      }
      setMessage('Invitation sent')
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSend}
        disabled={isPending}
        className={compact
          ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm disabled:opacity-60'
          : cn(STYLES.btn, STYLES.btnSecondary)
        }
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
        Send Invitation
      </button>
      {message && (
        <span className={cn('text-xs', message === 'Invitation sent' ? 'text-emerald-600' : 'text-red-600')}>
          {message}
        </span>
      )}
    </div>
  )
}
