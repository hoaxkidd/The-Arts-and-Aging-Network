import { cn } from '@/lib/utils'

export type InlineStatItem = {
  label: string
  value: string | number
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  hint?: string
}

type InlineStatStripProps = {
  items: InlineStatItem[]
  className?: string
  size?: 'compact' | 'tall'
}

const TONE_CLASS: Record<NonNullable<InlineStatItem['tone']>, string> = {
  default: 'text-gray-800',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-blue-700',
}

const TONE_CARD_CLASS: Record<NonNullable<InlineStatItem['tone']>, string> = {
  default: 'border-gray-200 bg-white',
  success: 'border-emerald-200 bg-emerald-50',
  warning: 'border-amber-200 bg-amber-50',
  danger: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50',
}

const TONE_LABEL_CLASS: Record<NonNullable<InlineStatItem['tone']>, string> = {
  default: 'text-gray-500',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-blue-700',
}

export function InlineStatStrip({ items, className, size = 'compact' }: InlineStatStripProps) {
  const cardSizeClass = size === 'tall' ? 'px-3 py-2 min-h-[56px]' : 'px-2 py-1'

  return (
    <div className={cn('flex w-full flex-wrap gap-2', className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn('flex min-w-0 flex-1 items-center justify-between gap-2 rounded border', cardSizeClass, TONE_CARD_CLASS[item.tone || 'default'])}
        >
          <span className={cn('truncate text-[10px] font-semibold uppercase tracking-wide', TONE_LABEL_CLASS[item.tone || 'default'])}>{item.label}</span>
          <div className="ml-auto flex items-center gap-1 text-right">
            <span className={cn('truncate text-right text-xs font-semibold tabular-nums', TONE_CLASS[item.tone || 'default'])}>{item.value}</span>
            {item.hint ? <span className="text-[11px] text-gray-400">{item.hint}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
