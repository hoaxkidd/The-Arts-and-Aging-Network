'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { FormTemplateBuilder } from './FormTemplateBuilder'

export function CreateTemplateButton() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  const handleCreated = (template: { id: string; title: string }) => {
    setShowModal(false)
    router.push(`/admin/forms?tab=templates`)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
      >
        <Plus className="w-4 h-4 inline mr-1" /> Create Template
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[70vw] max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-semibold">Create Form Template</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Builder Content */}
            <div className="flex-1 overflow-auto">
              <FormTemplateBuilder
                onCreated={handleCreated}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
