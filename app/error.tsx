'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  const isServerActionNotFound =
    typeof error?.message === 'string' &&
    (error.message.includes('was not found on the server') || error.message.includes('Server Action'))

  const handleTryAgain = () => {
    if (isServerActionNotFound) {
      // Force full reload of login so the client gets fresh JS and new Server Action IDs
      window.location.href = '/login'
      return
    }
    reset()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-600 mb-4">
          {isServerActionNotFound
            ? 'The page is out of date (e.g. after a new deployment). Reload the login page and try again.'
            : 'A server error occurred. This can be caused by missing or incorrect environment variables on Vercel.'}
        </p>
        <p className="text-xs text-gray-500 mb-4 font-mono break-all">
          {error.message}
        </p>
        {!isServerActionNotFound && (
          <div className="text-left text-xs text-gray-500 bg-gray-50 rounded p-3 mb-4">
            <p className="font-medium mb-1">Check Vercel → Settings → Environment Variables:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>AUTH_SECRET (required)</li>
              <li>NEXTAUTH_URL (e.g. https://your-app.vercel.app)</li>
              <li>DATABASE_URL (Neon pooled)</li>
              <li>DATABASE_URL_UNPOOLED (Neon direct)</li>
            </ul>
          </div>
        )}
        <button
          onClick={handleTryAgain}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          {isServerActionNotFound ? 'Go to login' : 'Try again'}
        </button>
      </div>
    </div>
  )
}
