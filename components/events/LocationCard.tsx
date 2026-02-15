'use client'

import { useState } from 'react'
import { MapPin, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

type LocationCardProps = {
  name: string
  address: string
}

export function LocationCard({ name, address }: LocationCardProps) {
  const [showMap, setShowMap] = useState(false)
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary-600" /> Location
        </h3>
      </div>

      {/* Content */}
      <div className="p-6">
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gray-900 hover:text-primary-600 transition-colors inline-block mb-1"
        >
          {name}
        </a>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed break-words">{address}</p>

        {/* Toggle Map Button */}
        <button
          onClick={() => setShowMap(!showMap)}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors mb-3"
        >
          {showMap ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide Map
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show Map
            </>
          )}
        </button>

        {/* Collapsible Map */}
        {showMap && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-video bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-opacity mb-3"
          >
            <iframe
              src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </a>
        )}

        {/* Quick link */}
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 transition-colors"
        >
          Open in Google Maps <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
