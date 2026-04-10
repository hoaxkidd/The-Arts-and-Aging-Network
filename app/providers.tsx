'use client'

import { GoogleMapsProvider } from '@/components/ui/GoogleMapsContext'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleMapsProvider>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={10000}
      />
    </GoogleMapsProvider>
  )
}
