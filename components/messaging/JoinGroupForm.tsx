'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { requestGroupAccess } from '@/app/actions/messaging'
import { CheckCircle, Clock } from 'lucide-react'

type JoinGroupFormProps = {
  groupId: string
  allowAllStaff: boolean
  isPending: boolean
}

export function JoinGroupForm({ groupId, allowAllStaff, isPending }: JoinGroupFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handleJoin = async () => {
    setLoading(true)
    const result = await requestGroupAccess(groupId, message)

    if (result.success) {
      setSuccess(true)
      if (result.autoApproved) {
        // Auto-approved, redirect to group
        setTimeout(() => router.push(`/staff/groups/${groupId}`), 1000)
      } else {
        // Pending approval
        setTimeout(() => router.push('/staff/groups'), 2000)
      }
    } else {
      setLoading(false)
      alert(result.error || 'Failed to join group')
    }
  }

  if (isPending) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Request Pending
        </h3>
        <p className="text-sm text-yellow-700">
          Your request to join this group is waiting for admin approval.
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          {allowAllStaff ? 'Joined Successfully!' : 'Request Sent!'}
        </h3>
        <p className="text-sm text-green-700">
          {allowAllStaff
            ? 'Redirecting to group...'
            : 'You will be notified when an admin approves your request.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {allowAllStaff ? 'Join this group' : 'Request to join'}
      </h3>

      {!allowAllStaff && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message to admin (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Why do you want to join this group?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleJoin}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Joining...' : allowAllStaff ? 'Join Group' : 'Send Request'}
        </button>
        <button
          onClick={() => router.push('/staff/groups')}
          className="px-4 py-2 text-gray-700 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>

      {allowAllStaff && (
        <p className="text-xs text-gray-500 mt-3">
          This group is open to all staff. You can join instantly.
        </p>
      )}
    </div>
  )
}
