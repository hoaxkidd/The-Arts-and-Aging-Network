'use client'

import { useState } from 'react'
import { Phone, Loader2, Check, X } from 'lucide-react'
import { requestPhoneNumber } from '@/app/actions/communication'

type Props = {
  staffId: string
  currentStatus: string | null // null, 'PENDING', 'APPROVED', 'DENIED'
  phoneNumber?: string | null
}

export function PhoneRequestButton({ staffId, currentStatus, phoneNumber }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [isPending, setIsPending] = useState(false)
  const [showNumber, setShowNumber] = useState(false)

  async function handleRequest() {
    setIsPending(true)
    const result = await requestPhoneNumber(staffId)

    if (result.error) {
      alert(result.error)
    } else {
      setStatus('PENDING')
    }
    setIsPending(false)
  }

  // Already approved - show phone number
  if (status === 'APPROVED' && phoneNumber) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowNumber(!showNumber)}
          className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
        >
          <Phone className="w-4 h-4" />
          {showNumber ? phoneNumber : 'Show Phone'}
        </button>
        {showNumber && (
          <a
            href={`tel:${phoneNumber}`}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Call
          </a>
        )}
      </div>
    )
  }

  // Approved but no phone available
  if (status === 'APPROVED') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
        <Check className="w-4 h-4" />
        Phone shared (check notifications)
      </div>
    )
  }

  // Request pending
  if (status === 'PENDING') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
        <Loader2 className="w-4 h-4" />
        Request pending
      </div>
    )
  }

  // Request denied
  if (status === 'DENIED') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-500 rounded-lg text-sm">
        <X className="w-4 h-4" />
        Request declined
      </div>
    )
  }

  // No request yet - show request button
  return (
    <button
      onClick={handleRequest}
      disabled={isPending}
      className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Phone className="w-4 h-4" />
      )}
      Request Phone
    </button>
  )
}
