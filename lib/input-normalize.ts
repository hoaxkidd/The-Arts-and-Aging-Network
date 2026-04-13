export function normalizeText(value: FormDataEntryValue | string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  const text = String(value).trim().replace(/\s+/g, ' ')
  return text.length > 0 ? text : undefined
}

export function normalizeMultilineText(value: FormDataEntryValue | string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  const text = String(value)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()
  return text.length > 0 ? text : undefined
}
