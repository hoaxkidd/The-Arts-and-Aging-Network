'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AddressComponents = {
  streetNumber?: string
  street?: string
  streetAddress?: string
  city?: string
  province?: string
  postalCode?: string
  country?: string
  formattedAddress: string
  /** Coordinates from Google Places (when available) */
  lat?: number
  lng?: number
}

declare global {
  interface Window {
    google?: typeof google
    initGooglePlaces?: () => void
  }
}

type Props = {
  value: string
  onChange: (value: string, components?: AddressComponents) => void
  /** Called when coordinates are available (e.g. from Google Places) */
  onCoords?: (lat: number, lng: number) => void
  name?: string
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
  /** Restrict to countries (e.g. ['ca', 'us']) */
  countries?: string[]
  /** Show loading indicator */
  showLoader?: boolean
  /** Input type: single line or textarea */
  multiline?: boolean
}

const ADDRESS_COMPONENT_MAP: Record<string, keyof Omit<AddressComponents, 'formattedAddress' | 'streetAddress'>> = {
  street_number: 'streetNumber',
  route: 'street',
  locality: 'city',
  administrative_area_level_1: 'province',
  postal_code: 'postalCode',
  country: 'country',
  postal_town: 'city',
  sublocality_level_1: 'city',
}

function parseAddressComponents(place: google.maps.places.PlaceResult): AddressComponents {
  const components: Partial<AddressComponents> = {}
  const addr = place.address_components || []

  for (const c of addr) {
    const type = c.types[0]
    const key = ADDRESS_COMPONENT_MAP[type]
    if (key && !components[key] && c.long_name) {
      (components as Record<string, string>)[key] = c.long_name
    }
  }

  const streetAddress = [components.streetNumber, components.street].filter(Boolean).join(' ')
  const formattedAddress = place.formatted_address || streetAddress

  return {
    ...components,
    streetAddress: streetAddress || undefined,
    formattedAddress,
  }
}

export function AddressAutocomplete({
  value,
  onChange,
  name = 'address',
  placeholder = 'Start typing address...',
  className,
  required,
  disabled,
  countries = ['ca'],
  showLoader = true,
  multiline = false,
  onCoords,
}: Props) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      setIsLoading(false)
      return
    }

    if (window.google?.maps?.places) {
      setIsLoaded(true)
      setIsLoading(false)
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      setIsLoaded(true)
      setIsLoading(false)
    }
    script.onerror = () => setIsLoading(false)
    document.head.appendChild(script)
    return () => {
      script.remove()
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !window.google?.maps?.places) return

    const input = inputRef.current as HTMLInputElement
    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: countries.length ? { country: countries } : undefined,
      fields: ['address_components', 'formatted_address', 'geometry'],
    })

    autocompleteRef.current = autocomplete

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place.formatted_address) {
        const components = parseAddressComponents(place)
        const loc = place.geometry?.location
        const lat = loc?.lat()
        const lng = loc?.lng()
        const full: AddressComponents = {
          ...components,
          formattedAddress: place.formatted_address,
          ...(lat != null && lng != null && { lat, lng }),
        }
        onChange(place.formatted_address, full)
        if (lat != null && lng != null && onCoords) onCoords(lat, lng)
      }
    })

    return () => {
      if (listener) window.google?.maps?.event?.removeListener(listener)
      autocompleteRef.current = null
    }
  }, [isLoaded, countries, onChange, onCoords])

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  const hasGoogle = !!apiKey && isLoaded

  const inputClasses = cn(
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400',
    'focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none',
    disabled && 'cursor-not-allowed bg-gray-50 opacity-60',
    className
  )

  const inputProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    placeholder,
    required,
    disabled,
    autoComplete: 'off' as const,
  }

  if (!hasGoogle) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          name={name}
          {...inputProps}
          rows={2}
          className={inputClasses}
        />
      )
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        name={name}
        {...inputProps}
        className={inputClasses}
      />
    )
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} readOnly />
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        {...inputProps}
        className={cn(inputClasses, 'pr-10')}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        {isLoading && showLoader ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MapPin className="w-4 h-4" />
        )}
      </div>
    </div>
  )
}
