'use client'

import { toast } from 'sonner'
import { AppToast } from '@/components/ui/AppToast'

type NotifyInput = {
  title: string
  description?: string
}

export const notify = {
  success({ title, description }: NotifyInput) {
    toast.custom(() => <AppToast tone="success" title={title} description={description} />)
  },
  error({ title, description }: NotifyInput) {
    toast.custom(() => <AppToast tone="error" title={title} description={description} />)
  },
  warning({ title, description }: NotifyInput) {
    toast.custom(() => <AppToast tone="warning" title={title} description={description} />)
  },
  info({ title, description }: NotifyInput) {
    toast.custom(() => <AppToast tone="info" title={title} description={description} />)
  },
}
