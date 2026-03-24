import DOMPurify from 'dompurify'
import { logger } from './logger'

export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return ''
  }

  if (typeof window === 'undefined') {
    return dirty
  }

  try {
    const purify = (DOMPurify as unknown as (window: Window) => { sanitize: (dirty: string) => string })(window)
    return purify.sanitize(dirty)
  } catch (error) {
    logger.error('DOMPurify sanitization error:', error)
    return dirty
  }
}
