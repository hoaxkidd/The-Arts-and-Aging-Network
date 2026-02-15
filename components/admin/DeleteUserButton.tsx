'use client'

import { useState } from 'react'
import { deleteUser } from '@/app/actions/user-management'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, X } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

export default function DeleteUserButton({ userId, userName }: { userId: string, userName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }

    setIsDeleting(true)
    setError('')

    const result = await deleteUser(userId)

    if (result.error) {
      setError(result.error)
      setIsDeleting(false)
    } else {
      // Success - redirect to users list
      router.push('/admin/users')
      router.refresh()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete User
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
              <p className="text-sm text-gray-500">{userName}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
            disabled={isDeleting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This action cannot be undone. This will permanently delete:
            </p>
            <ul className="mt-2 text-xs text-red-700 space-y-1 ml-4">
              <li>• User account and profile</li>
              <li>• All messages sent by this user</li>
              <li>• All notifications</li>
              <li>• Conversation history</li>
              <li>• Group memberships</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-bold text-red-600">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className={cn(STYLES.input, "font-mono")}
              disabled={isDeleting}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setIsOpen(false)}
              className={cn(STYLES.btn, STYLES.btnSecondary, "flex-1")}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className={cn(
                STYLES.btn,
                "flex-1 bg-red-600 hover:bg-red-700 text-white",
                isDeleting && "opacity-50 cursor-not-allowed"
              )}
              disabled={isDeleting || confirmText !== 'DELETE'}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Permanently
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
