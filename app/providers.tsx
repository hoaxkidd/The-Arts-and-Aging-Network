'use client'

import { GoogleMapsProvider } from '@/components/ui/GoogleMapsContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleMapsProvider>
      {children}
    </GoogleMapsProvider>
  )
}
