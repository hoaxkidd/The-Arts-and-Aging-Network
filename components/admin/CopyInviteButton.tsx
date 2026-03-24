'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type CopyInviteButtonProps = {
  url: string
  className?: string
}

export function CopyInviteButton({ url, className }: CopyInviteButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
          copied 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        )}
        title="Copy invite link"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </>
        )}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary-600 hover:underline"
        title="Open invite link"
      >
        Open
      </a>
    </div>
  )
}