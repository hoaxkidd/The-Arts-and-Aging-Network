'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true)
      checkSubscription()
    }
    setLoading(false)
  }, [])

  async function checkSubscription() {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    setIsEnabled(!!subscription)
  }

  async function getPublicKey() {
    const response = await fetch('/api/push', { method: 'GET' })
    const data = await response.json()
    return data.publicKey
  }

  async function subscribe() {
    if (!isSupported) return

    setSubscribing(true)
    try {
      const publicKey = await getPublicKey()
      if (!publicKey) {
        alert('Push notifications are not configured')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      })

      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON())
      })

      setIsEnabled(true)
    } catch (error) {
      console.error('Subscribe error:', error)
      alert('Failed to enable push notifications')
    }
    setSubscribing(false)
  }

  async function unsubscribe() {
    setSubscribing(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        })
        
        await subscription.unsubscribe()
      }

      setIsEnabled(false)
    } catch (error) {
      console.error('Unsubscribe error:', error)
      alert('Failed to disable push notifications')
    }
    setSubscribing(false)
  }

  if (loading) {
    return (
      <button disabled className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading...
      </button>
    )
  }

  if (!isSupported) {
    return null
  }

  return (
    <button
      onClick={isEnabled ? unsubscribe : subscribe}
      disabled={subscribing}
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
        isEnabled 
          ? 'text-primary-600 hover:bg-primary-50' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {subscribing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isEnabled ? (
        <>
          <Bell className="w-4 h-4" />
          Notifications On
        </>
      ) : (
        <>
          <BellOff className="w-4 h-4" />
          Enable Notifications
        </>
      )}
    </button>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
