'use client'

import { useState } from 'react'
import { Eye, X } from 'lucide-react'
import { parseFormFields } from '@/lib/form-template-types'
import { FormTemplateView } from '@/components/forms/FormTemplateView'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

type FormPreviewButtonProps = {
  template: {
    title: string
    description?: string | null
    descriptionHtml?: string | null
    formFields?: string | null
  }
  buttonClassName?: string
  buttonLabel?: string
}

export function FormPreviewButton({
  template,
  buttonClassName,
  buttonLabel = 'Preview',
}: FormPreviewButtonProps) {
  const [open, setOpen] = useState(false)
  const fields = parseFormFields(template.formFields ?? null)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Quick preview"
        className={cn(STYLES.btn, STYLES.btnSecondary, 'h-8 px-3 py-1.5 text-xs', buttonClassName)}
      >
        <Eye className="h-3.5 w-3.5" />
        {buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900">Form Preview</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <FormTemplateView
                title={template.title}
                description={template.description ?? null}
                descriptionHtml={template.descriptionHtml ?? null}
                fields={fields}
                preview
                values={{}}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
