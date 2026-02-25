import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'

interface GoogleMapsContextType {
  isLoaded: boolean
  isLoading: boolean
  loadError: Error | null
  google: typeof window.google | null
  loadMaps: () => Promise<void>
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  isLoading: false,
  loadError: null,
  google: null,
  loadMaps: async () => {}
})

export const GoogleMapsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [google, setGoogle] = useState<typeof window.google | null>(null)
  
  const loadingRef = useRef(false)
  const loadedRef = useRef(false)

  const loadMaps = async (): Promise<void> => {
    if (loadedRef.current || loadingRef.current) return
    
    loadingRef.current = true
    setIsLoading(true)
    setLoadError(null)

    try {
      if (window.google?.maps) {
        setGoogle(window.google)
        setIsLoaded(true)
        loadedRef.current = true
        loadingRef.current = false
        return
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        if (window.google?.maps) {
          setGoogle(window.google)
          setIsLoaded(true)
          loadedRef.current = true
        }
        loadingRef.current = false
        return
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
      if (!apiKey) {
        throw new Error('Google Places API key is not configured')
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true

      script.onload = () => {
        if (window.google?.maps) {
          setGoogle(window.google)
          setIsLoaded(true)
          loadedRef.current = true
        } else {
          setLoadError(new Error('Google Maps API failed to load'))
        }
        loadingRef.current = false
        setIsLoading(false)
      }

      script.onerror = () => {
        setLoadError(new Error('Failed to load Google Maps API script'))
        loadingRef.current = false
        setIsLoading(false)
      }

      document.head.appendChild(script)
    } catch (error) {
      setLoadError(error as Error)
      loadingRef.current = false
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (apiKey && !loadedRef.current) {
      loadMaps()
    }
  }, [])

  const value: GoogleMapsContextType = {
    isLoaded,
    isLoading,
    loadError,
    google,
    loadMaps
  }

  return (
    <GoogleMapsContext.Provider value={value}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext)
  if (!context) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider')
  }
  return context
}

export const GoogleMapsLoader: React.FC<{ apiKey?: string }> = ({ apiKey }) => {
  const { loadMaps, isLoading, loadError } = useGoogleMaps()

  useEffect(() => {
    if (apiKey) {
      loadMaps()
    }
  }, [apiKey, loadMaps])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 text-gray-500">
        Loading Google Maps...
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center p-4 text-red-500">
        Error loading Google Maps: {loadError.message}
      </div>
    )
  }

  return null
}