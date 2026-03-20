'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit2, Trash2, FileText, Loader2, X, Check } from 'lucide-react'
import { getMessageTemplates, createMessageTemplate, updateMessageTemplate, deleteMessageTemplate } from '@/app/actions/message-templates'
import { cn } from '@/lib/utils'

type Template = {
  id: string
  title: string
  content: string
  contentHtml: string | null
  category: string | null
  isGlobal: boolean
  usageCount: number
  createdBy: string
  createdAt: Date
}

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: ''
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    const result = await getMessageTemplates()
    if (result.success && result.data) {
      setTemplates(result.data as Template[])
    }
    setLoading(false)
  }

  function openForm(template?: Template) {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        title: template.title,
        content: template.content,
        category: template.category || ''
      })
    } else {
      setEditingTemplate(null)
      setFormData({ title: '', content: '', category: '' })
    }
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingTemplate(null)
    setFormData({ title: '', content: '', category: '' })
  }

  async function handleSave() {
    if (!formData.title.trim() || !formData.content.trim()) return

    setSaving(true)
    
    if (editingTemplate) {
      const result = await updateMessageTemplate(editingTemplate.id, {
        title: formData.title,
        content: formData.content,
        category: formData.category || undefined
      })
      if (!result.error) {
        loadTemplates()
        closeForm()
      }
    } else {
      const result = await createMessageTemplate({
        title: formData.title,
        content: formData.content,
        category: formData.category || undefined
      })
      if (!result.error) {
        loadTemplates()
        closeForm()
      }
    }
    
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return
    
    const result = await deleteMessageTemplate(id)
    if (!result.error) {
      loadTemplates()
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No templates yet</h3>
            <p className="text-xs text-gray-500">Create templates to quickly send common messages</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900">{template.title}</h3>
                      {template.isGlobal && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Global
                        </span>
                      )}
                      {template.category && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {template.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{template.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Used {template.usageCount} times
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openForm(template)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <button
                onClick={closeForm}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Welcome Message"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Category (optional)</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g., Onboarding, Support"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                  placeholder="Template content..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.title.trim() || !formData.content.trim() || saving}
                className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editingTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
