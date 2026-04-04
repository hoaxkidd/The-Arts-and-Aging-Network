import { logger } from '@/lib/logger'

type SendSmsParams = {
  to: string
  message: string
}

type SendSmsResult = {
  success: boolean
  messageId?: string
  error?: string
}

function sanitizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.length === 10) return `+1${cleaned}`
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`
  return cleaned
}

export async function sendSMS(params: SendSmsParams): Promise<SendSmsResult> {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim()
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim()
  const from = (process.env.TWILIO_FROM_NUMBER || '').trim()

  if (!accountSid || !authToken || !from) {
    logger.warn('SMS skipped: Twilio credentials are not configured', {
      hasSid: Boolean(accountSid),
      hasToken: Boolean(authToken),
      hasFrom: Boolean(from),
    }, 'api')
    return { success: false, error: 'SMS service not configured' }
  }

  const to = sanitizePhoneNumber(params.to)
  if (!to) {
    return { success: false, error: 'Invalid destination phone number' }
  }

  try {
    const body = new URLSearchParams({
      To: to,
      From: from,
      Body: params.message,
    })

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    const data = await response.json() as { sid?: string; message?: string }
    if (!response.ok) {
      return { success: false, error: data.message || 'Twilio request failed' }
    }

    return { success: true, messageId: data.sid }
  } catch (error) {
    logger.error('SMS send failed', { error }, 'api')
    return { success: false, error: 'Failed to send SMS' }
  }
}
