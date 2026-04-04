type HomeNotificationSource = 'custom' | 'primary-contact' | 'user-fallback' | 'none'

type HomeNotificationInput = {
  contactEmail?: string | null
  useCustomNotificationEmail?: boolean | null
  notificationEmail?: string | null
  user?: {
    email?: string | null
  } | null
}

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) return null
  return trimmed
}

export function resolveHomeNotificationRecipient(home: HomeNotificationInput): {
  email: string | null
  source: HomeNotificationSource
} {
  const customEmail = normalizeEmail(home.notificationEmail)
  const primaryContactEmail = normalizeEmail(home.contactEmail)
  const userEmail = normalizeEmail(home.user?.email)

  if (home.useCustomNotificationEmail && customEmail) {
    return { email: customEmail, source: 'custom' }
  }

  if (primaryContactEmail) {
    return { email: primaryContactEmail, source: 'primary-contact' }
  }

  if (userEmail) {
    return { email: userEmail, source: 'user-fallback' }
  }

  return { email: null, source: 'none' }
}
