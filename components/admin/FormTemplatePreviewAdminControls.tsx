'use client'

import Link from 'next/link'
import { Edit2, Trash2, Settings2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type FormTemplatePreviewAdminControlsProps = {
  templateId: string
  isActive?: boolean
  onAccess?: () => void
  onDelete?: () => void
  onClose?: () => void
  className?: string
}

export function FormTemplatePreviewAdminControls({
  templateId,
  isActive,
  onAccess,
  onDelete,
  onClose,
  className,
}: FormTemplatePreviewAdminControlsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {typeof isActive === 'boolean' && (
        <span
          className={cn(
            'text-xs px-2 py-1 font-medium rounded-full',
            isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          )}
        >
          {isActive ? 'Active' : 'Archived'}
        </span>
      )}

      {onAccess && (
        <button
          type="button"
          onClick={onAccess}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Access
        </button>
      )}

      <Link
        href={`/admin/forms/${templateId}/edit`}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-700 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200"
      >
        <Edit2 className="w-3.5 h-3.5" />
        Edit
      </Link>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      )}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          aria-label="Close preview"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
