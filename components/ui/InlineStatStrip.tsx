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
}

const TONE_CLASS: Record<NonNullable<InlineStatItem['tone']>, string> = {
  default: 'text-gray-700',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-blue-700',
}

export function InlineStatStrip({ items, className }: InlineStatStripProps) {
  return (
    <div className={cn('flex w-full flex-wrap gap-2', className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-[120px] items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2"
        >
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{item.label}</span>
          <div className="ml-auto flex items-center gap-1 text-right">
            <span className={cn('text-sm font-semibold tabular-nums', TONE_CLASS[item.tone || 'default'])}>{item.value}</span>
            {item.hint ? <span className="text-[11px] text-gray-400">{item.hint}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
