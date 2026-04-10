export type ReminderPolicyConfig = {
  homeAdminOffsets: number[]
  staffOffsets: number[]
  cronEndpoint: string
  cronFrequency: string
}

export const REMINDER_POLICY_TEMPLATE_TYPE = 'EMAIL_REMINDER_POLICY_CONFIG'

export const ALLOWED_CRON_ENDPOINTS = ['/api/cron/reminders'] as const

export const ALLOWED_CRON_FREQUENCIES = [
  'Every 15 minutes',
  'Every 30 minutes',
  'Every hour',
  'Every 2 hours',
  'Every 6 hours',
  'Daily',
] as const

export const DEFAULT_REMINDER_POLICY_CONFIG: ReminderPolicyConfig = {
  homeAdminOffsets: [7, 5],
  staffOffsets: [3, 1],
  cronEndpoint: ALLOWED_CRON_ENDPOINTS[0],
  cronFrequency: 'Every hour',
}

export function normalizeOffsets(input: number[], fallback: number[]): number[] {
  const cleaned = Array.from(new Set(input.filter((value) => Number.isFinite(value) && value >= 1 && value <= 30)))
  if (cleaned.length === 0) return [...fallback]
  return cleaned.sort((a, b) => b - a)
}

export function parseReminderPolicyConfig(content: string | null | undefined): ReminderPolicyConfig {
  if (!content) return { ...DEFAULT_REMINDER_POLICY_CONFIG }

  try {
    const parsed = JSON.parse(content) as Partial<ReminderPolicyConfig>
    const homeAdminOffsets = normalizeOffsets(parsed.homeAdminOffsets || [], DEFAULT_REMINDER_POLICY_CONFIG.homeAdminOffsets)
    const staffOffsets = normalizeOffsets(parsed.staffOffsets || [], DEFAULT_REMINDER_POLICY_CONFIG.staffOffsets)
    const parsedEndpoint = (parsed.cronEndpoint || DEFAULT_REMINDER_POLICY_CONFIG.cronEndpoint).trim()
    const parsedFrequency = (parsed.cronFrequency || DEFAULT_REMINDER_POLICY_CONFIG.cronFrequency).trim()

    const cronEndpoint = ALLOWED_CRON_ENDPOINTS.includes(parsedEndpoint as (typeof ALLOWED_CRON_ENDPOINTS)[number])
      ? parsedEndpoint
      : DEFAULT_REMINDER_POLICY_CONFIG.cronEndpoint

    const cronFrequency = ALLOWED_CRON_FREQUENCIES.includes(parsedFrequency as (typeof ALLOWED_CRON_FREQUENCIES)[number])
      ? parsedFrequency
      : DEFAULT_REMINDER_POLICY_CONFIG.cronFrequency

    return {
      homeAdminOffsets,
      staffOffsets,
      cronEndpoint,
      cronFrequency,
    }
  } catch {
    return { ...DEFAULT_REMINDER_POLICY_CONFIG }
  }
}
