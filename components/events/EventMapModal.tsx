'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, MapPin, X } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

type EventMapModalProps = {
  locationName: string
  address: string
}

export function EventMapModal({ locationName, address }: EventMapModalProps) {
  const [open, setOpen] = useState(false)

  const mapsUrl = useMemo(() => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }, [address])

  const embedUrl = useMemo(() => {
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
  }, [address])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600"
        title={`${address} (click to view map)`}
      >
        <MapPin className="w-4 h-4 text-green-500" />
        <span className="underline underline-offset-2">{locationName}</span>
        <span className="text-[11px] font-medium text-primary-600">View map</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Location</p>
                <h3 className="text-sm font-semibold text-gray-900">{locationName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Close map"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-4">
              <p className="mb-2 text-sm text-gray-600">{address}</p>
              <div className="h-[420px] overflow-hidden rounded-lg border border-gray-200">
                <iframe
                  title={`Map for ${locationName}`}
                  src={embedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className="mt-3 flex justify-end">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(STYLES.btn, STYLES.btnSecondary, 'text-xs')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
