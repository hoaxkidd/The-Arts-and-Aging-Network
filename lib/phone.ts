export function formatPhoneDashed(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function normalizePhone(raw: FormDataEntryValue | string | null | undefined): string | undefined {
  if (raw === null || raw === undefined) return undefined
  const value = typeof raw === 'string' ? raw : String(raw)
  const formatted = formatPhoneDashed(value.trim())
  return formatted.length > 0 ? formatted : undefined
}
