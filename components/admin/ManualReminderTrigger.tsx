'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'

export function ManualReminderTrigger() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    results?: { processed: number; sent: number; failed: number }
  } | null>(null)

  const triggerReminders = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/cron/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: 'Reminders processed successfully',
          results: data.results
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to process reminders'
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Manual Trigger</h3>
          <p className="text-xs text-gray-500">Process pending reminders now</p>
        </div>
        <button
          onClick={triggerReminders}
          disabled={loading}
          className={cn(
            STYLES.btn,
            STYLES.btnPrimary,
            "text-xs",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Process Now
            </>
          )}
        </button>
      </div>

      {result && (
        <div
          className={cn(
            "p-3 rounded-lg border flex items-start gap-2",
            result.success
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          )}
        >
          {result.success ? (
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p
              className={cn(
                "text-sm font-medium",
                result.success ? "text-green-900" : "text-red-900"
              )}
            >
              {result.message}
            </p>
            {result.results && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="bg-white rounded px-2 py-1">
                  <p className="text-xs text-gray-500">Processed</p>
                  <p className="text-lg font-bold text-gray-900">{result.results.processed}</p>
                </div>
                <div className="bg-white rounded px-2 py-1">
                  <p className="text-xs text-green-600">Sent</p>
                  <p className="text-lg font-bold text-green-600">{result.results.sent}</p>
                </div>
                <div className="bg-white rounded px-2 py-1">
                  <p className="text-xs text-red-600">Failed</p>
                  <p className="text-lg font-bold text-red-600">{result.results.failed}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
