import DOMPurify from 'dompurify'

export function sanitizeHtml(dirty: string): string {
  // For server-side rendering, we don't need a window object
  // Using type assertion to bypass the TypeScript issue with DOMPurify v3
  return (DOMPurify as unknown as (dirty: string) => string)(dirty)
}
