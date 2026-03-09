import DOMPurify from 'dompurify'

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
    console.error('DOMPurify sanitization error:', error)
    return dirty
  }
}
