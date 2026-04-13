import { DEFAULT_EMAIL_STYLE_PRESET, type EmailStylePreset } from './types'

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

function normalizeColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed
}

function normalizeText(value: unknown, fallback: string, maxLength = 120): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.slice(0, maxLength)
}

function normalizeEnum<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  if (typeof value !== 'string') return fallback
  return (options as readonly string[]).includes(value) ? (value as T) : fallback
}

export function sanitizeEmailStylePreset(input: unknown): EmailStylePreset {
  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}

  return {
    fontFamily: normalizeText(raw.fontFamily, DEFAULT_EMAIL_STYLE_PRESET.fontFamily, 100),
    bodyBackground: normalizeColor(raw.bodyBackground, DEFAULT_EMAIL_STYLE_PRESET.bodyBackground),
    surfaceBackground: normalizeColor(raw.surfaceBackground, DEFAULT_EMAIL_STYLE_PRESET.surfaceBackground),
    textColor: normalizeColor(raw.textColor, DEFAULT_EMAIL_STYLE_PRESET.textColor),
    headingColor: normalizeColor(raw.headingColor, DEFAULT_EMAIL_STYLE_PRESET.headingColor),
    headerBackgroundColor: normalizeColor(raw.headerBackgroundColor, DEFAULT_EMAIL_STYLE_PRESET.headerBackgroundColor),
    buttonColor: normalizeColor(raw.buttonColor, DEFAULT_EMAIL_STYLE_PRESET.buttonColor),
    buttonTextColor: normalizeColor(raw.buttonTextColor, DEFAULT_EMAIL_STYLE_PRESET.buttonTextColor),
    borderRadius: clampNumber(raw.borderRadius, DEFAULT_EMAIL_STYLE_PRESET.borderRadius, 0, 28),
    contentMaxWidth: clampNumber(raw.contentMaxWidth, DEFAULT_EMAIL_STYLE_PRESET.contentMaxWidth, 480, 900),
    sectionPadding: clampNumber(raw.sectionPadding, DEFAULT_EMAIL_STYLE_PRESET.sectionPadding, 12, 48),
    showHeader: typeof raw.showHeader === 'boolean' ? raw.showHeader : DEFAULT_EMAIL_STYLE_PRESET.showHeader,
    showFooter: typeof raw.showFooter === 'boolean' ? raw.showFooter : DEFAULT_EMAIL_STYLE_PRESET.showFooter,
    headerTitle: normalizeText(raw.headerTitle, DEFAULT_EMAIL_STYLE_PRESET.headerTitle),
    footerText: normalizeText(raw.footerText, DEFAULT_EMAIL_STYLE_PRESET.footerText),
    showBanner: typeof raw.showBanner === 'boolean' ? raw.showBanner : DEFAULT_EMAIL_STYLE_PRESET.showBanner,
    bannerTitle: normalizeText(raw.bannerTitle, DEFAULT_EMAIL_STYLE_PRESET.bannerTitle),
    bannerSubtitle: normalizeText(raw.bannerSubtitle, DEFAULT_EMAIL_STYLE_PRESET.bannerSubtitle),
    bannerBackgroundStart: normalizeColor(raw.bannerBackgroundStart, DEFAULT_EMAIL_STYLE_PRESET.bannerBackgroundStart),
    bannerBackgroundEnd: normalizeColor(raw.bannerBackgroundEnd, DEFAULT_EMAIL_STYLE_PRESET.bannerBackgroundEnd),
    bannerTextColor: normalizeColor(raw.bannerTextColor, DEFAULT_EMAIL_STYLE_PRESET.bannerTextColor),
    bannerAlign: normalizeEnum(raw.bannerAlign, ['left', 'center'] as const, DEFAULT_EMAIL_STYLE_PRESET.bannerAlign),
    bannerPadding: clampNumber(raw.bannerPadding, DEFAULT_EMAIL_STYLE_PRESET.bannerPadding, 10, 40),
    headerTitleSize: clampNumber(raw.headerTitleSize, DEFAULT_EMAIL_STYLE_PRESET.headerTitleSize, 14, 36),
    headerWeight: clampNumber(raw.headerWeight, DEFAULT_EMAIL_STYLE_PRESET.headerWeight, 400, 900),
    headerAlign: normalizeEnum(raw.headerAlign, ['left', 'center'] as const, DEFAULT_EMAIL_STYLE_PRESET.headerAlign),
    showHeaderDivider: typeof raw.showHeaderDivider === 'boolean' ? raw.showHeaderDivider : DEFAULT_EMAIL_STYLE_PRESET.showHeaderDivider,
    bodyFontSize: clampNumber(raw.bodyFontSize, DEFAULT_EMAIL_STYLE_PRESET.bodyFontSize, 12, 20),
    bodyLineHeight: clampNumber(raw.bodyLineHeight, DEFAULT_EMAIL_STYLE_PRESET.bodyLineHeight, 1.2, 2),
    paragraphSpacing: clampNumber(raw.paragraphSpacing, DEFAULT_EMAIL_STYLE_PRESET.paragraphSpacing, 6, 30),
    linkColor: normalizeColor(raw.linkColor, DEFAULT_EMAIL_STYLE_PRESET.linkColor),
    showSectionDividers: typeof raw.showSectionDividers === 'boolean'
      ? raw.showSectionDividers
      : DEFAULT_EMAIL_STYLE_PRESET.showSectionDividers,
    buttonRadius: clampNumber(raw.buttonRadius, DEFAULT_EMAIL_STYLE_PRESET.buttonRadius, 0, 20),
    buttonBorderColor: normalizeColor(raw.buttonBorderColor, DEFAULT_EMAIL_STYLE_PRESET.buttonBorderColor),
    buttonBorderWidth: clampNumber(raw.buttonBorderWidth, DEFAULT_EMAIL_STYLE_PRESET.buttonBorderWidth, 0, 3),
    buttonPaddingY: clampNumber(raw.buttonPaddingY, DEFAULT_EMAIL_STYLE_PRESET.buttonPaddingY, 8, 20),
    buttonPaddingX: clampNumber(raw.buttonPaddingX, DEFAULT_EMAIL_STYLE_PRESET.buttonPaddingX, 12, 40),
    footerDivider: typeof raw.footerDivider === 'boolean' ? raw.footerDivider : DEFAULT_EMAIL_STYLE_PRESET.footerDivider,
    footerTextColor: normalizeColor(raw.footerTextColor, DEFAULT_EMAIL_STYLE_PRESET.footerTextColor),
    footerBackgroundColor: normalizeColor(raw.footerBackgroundColor, DEFAULT_EMAIL_STYLE_PRESET.footerBackgroundColor),
  }
}

export function parseStylePresetJson(styleJson: string | null | undefined): EmailStylePreset {
  if (!styleJson) return DEFAULT_EMAIL_STYLE_PRESET
  try {
    const parsed = JSON.parse(styleJson) as unknown
    return sanitizeEmailStylePreset(parsed)
  } catch {
    return DEFAULT_EMAIL_STYLE_PRESET
  }
}

export function renderStyledEmailContent(content: string, style: EmailStylePreset): string {
  const safeContent = content || '<p></p>'
  const radius = `${style.borderRadius}px`
  const padding = `${style.sectionPadding}px`
  const shellStyle = [
    `max-width:${style.contentMaxWidth}px`,
    'margin:0 auto',
    `background:${style.surfaceBackground}`,
    `border-radius:${radius}`,
    'border:1px solid #e5e7eb',
    'overflow:hidden',
  ].join(';')

  const blockBase = [
    `font-family:${style.fontFamily}`,
    `color:${style.textColor}`,
    `background:${style.surfaceBackground}`,
  ].join(';')

  const banner = style.showBanner
    ? `<div style="padding:${style.bannerPadding}px ${style.sectionPadding}px;background:linear-gradient(135deg, ${style.bannerBackgroundStart} 0%, ${style.bannerBackgroundEnd} 100%);color:${style.bannerTextColor};text-align:${style.bannerAlign};">
        <div style="font-size:18px;font-weight:700;">${style.bannerTitle}</div>
        ${style.bannerSubtitle ? `<div style="margin-top:6px;font-size:13px;opacity:0.95;">${style.bannerSubtitle}</div>` : ''}
      </div>`
    : ''

  const header = style.showHeader
    ? `<div style="padding:${padding};text-align:${style.headerAlign};background:${style.headerBackgroundColor};${style.showHeaderDivider ? 'border-bottom:1px solid #e5e7eb;' : ''}">
        <div style="font-size:${style.headerTitleSize}px;color:${style.headingColor};font-weight:${style.headerWeight};">
          ${style.headerTitle}
        </div>
      </div>`
    : ''

  const footer = style.showFooter
    ? `<div style="padding:${padding};background:${style.footerBackgroundColor};color:${style.footerTextColor};text-align:center;font-size:12px;${style.footerDivider ? 'border-top:1px solid #e5e7eb;' : ''}">${style.footerText}</div>`
    : ''

  const styles = `
    <style>
      .email-shell a { color: ${style.linkColor}; }
      .email-shell p { margin: 0 0 ${style.paragraphSpacing}px 0; }
      .email-shell h1, .email-shell h2, .email-shell h3, .email-shell h4 { color: ${style.headingColor}; }
      .email-shell hr { border: 0; border-top: 1px solid #e5e7eb; margin: ${style.paragraphSpacing}px 0; display: ${style.showSectionDividers ? 'block' : 'none'}; }
      .email-shell .btn, .email-shell button, .email-shell a.button {
        background: ${style.buttonColor};
        color: ${style.buttonTextColor};
        border-radius: ${style.buttonRadius}px;
        border: ${style.buttonBorderWidth}px solid ${style.buttonBorderColor};
        padding: ${style.buttonPaddingY}px ${style.buttonPaddingX}px;
        text-decoration: none;
        display: inline-block;
      }
    </style>
  `

  return `
    ${styles}
    <div class="email-shell" style="margin:0;padding:20px;background:${style.bodyBackground};${blockBase};font-size:${style.bodyFontSize}px;line-height:${style.bodyLineHeight}">
      <div style="${shellStyle}">
        ${banner}
        ${header}
        <div style="padding:${padding};${blockBase}">
          ${safeContent}
        </div>
        ${footer}
      </div>
    </div>
  `
}
