'use client'

import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type AppToastProps = {
  title: string
  description?: string
  tone?: 'success' | 'error' | 'warning' | 'info'
}

const ICON_BY_TONE = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const

const ICON_CLASS_BY_TONE = {
  success: 'text-primary-600',
  error: 'text-primary-600',
  warning: 'text-primary-600',
  info: 'text-primary-600',
} as const

export function AppToast({ title, description, tone = 'info' }: AppToastProps) {
  const Icon = ICON_BY_TONE[tone]

  return (
    <div className="min-w-[280px] rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 shadow-sm">
      <div className="flex items-start gap-2">
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', ICON_CLASS_BY_TONE[tone])} aria-hidden />
      <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-900">{title}</p>
          {description ? <p className="mt-0.5 text-xs text-primary-700">{description}</p> : null}
        </div>
      </div>
    </div>
  )
}
