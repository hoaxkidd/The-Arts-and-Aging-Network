'use client'

import { GoogleMapsProvider } from '@/components/ui/GoogleMapsContext'
import { AppDialogProvider } from '@/components/ui/AppDialogs'
import { Toaster } from 'sonner'
import { useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[debug] Providers mounted')
    // #region agent log
    fetch('/api/debug-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: '7a8fa1',
        runId: 'smoke-pre',
        hypothesisId: 'H1',
        location: 'app/providers.tsx:Providers.useEffect',
        message: 'Providers mounted',
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7932/ingest/d150821c-e880-4593-9da4-b74c1d3885d0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7a8fa1' },
      body: JSON.stringify({
        sessionId: '7a8fa1',
        runId: 'repro-3',
        hypothesisId: 'H5',
        location: 'app/providers.tsx:Providers.useEffect',
        message: 'Client bundle executed',
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    const onError = (event: ErrorEvent) => {
      // #region agent log
      fetch('/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: '7a8fa1',
          runId: 'smoke-pre',
          hypothesisId: 'H2',
          location: 'app/providers.tsx:window.error',
          message: 'Window error',
          data: { message: String(event.message || ''), filename: String(event.filename || ''), lineno: event.lineno, colno: event.colno },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      // #region agent log
      fetch('/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: '7a8fa1',
          runId: 'smoke-pre',
          hypothesisId: 'H3',
          location: 'app/providers.tsx:window.unhandledrejection',
          message: 'Unhandled rejection',
          data: { reason: String((event as any).reason ?? '') },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  return (
    <GoogleMapsProvider>
      <AppDialogProvider>
        {children}
        <Toaster position="top-right" richColors closeButton duration={5000} />
      </AppDialogProvider>
    </GoogleMapsProvider>
  )
}
