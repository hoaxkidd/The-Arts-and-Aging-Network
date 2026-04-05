'use client'

import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { 
  Mail, Edit3, Send, Eye, X, Loader2, 
  Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, Link as LinkIcon,
  ToggleLeft, ToggleRight, Monitor
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import { EMAIL_TEMPLATE_INFO, EmailVariable } from '@/lib/email/types'
import { logger } from '@/lib/logger'

type EmailTemplate = {
  id: string
  type: string
  name: string
  subject: string
  content: string
  isActive: boolean
  isDefault: boolean
}

const EMAIL_VARIABLES: EmailVariable[] = [
  { key: '{{name}}', description: 'Recipient name', example: 'John Doe' },
  { key: '{{appUrl}}', description: 'Application URL', example: 'https://artsandaging.com' },
  { key: '{{supportEmail}}', description: 'Support email', example: 'support@artsandaging.com' },
  { key: '{{inviteUrl}}', description: 'Invitation link', example: 'https://artsandaging.com/invite/abc123' },
  { key: '{{eventTitle}}', description: 'Event title', example: 'Art Therapy Session' },
  { key: '{{eventDate}}', description: 'Event date', example: 'January 15, 2024' },
  { key: '{{eventTime}}', description: 'Event time', example: '2:00 PM' },
  { key: '{{eventLocation}}', description: 'Event location', example: 'Sunrise Care Home' },
  { key: '{{eventLink}}', description: 'Event details link', example: 'https://artsandaging.com/events/123' },
  { key: '{{message}}', description: 'Custom message', example: 'Thank you for signing up!' },
  { key: '{{role}}', description: 'User role', example: 'Staff' },
  { key: '{{expenseAmount}}', description: 'Expense amount', example: '$50.00' },
  { key: '{{timesheetWeek}}', description: 'Timesheet week', example: 'Week of Jan 15, 2024' },
  { key: '{{groupName}}', description: 'Group name', example: 'Art Volunteers' },
]

function RichTextEditor({ 
  content, 
  onChange,
  variables,
  onInsertVariable
}: { 
  content: string
  onChange: (html: string) => void
  variables: EmailVariable[]
  onInsertVariable: (variable: string) => void
}) {
  const [showVariableMenu, setShowVariableMenu] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Start typing your email content...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  })

  if (!editor) {
    return null
  }

  const setLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 flex-wrap">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "p-2 rounded hover:bg-gray-200 transition-colors",
            editor.isActive('bold') ? "bg-gray-200 text-primary-600" : "text-gray-700"
          )}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "p-2 rounded hover:bg-gray-200 transition-colors",
            editor.isActive('italic') ? "bg-gray-200 text-primary-600" : "text-gray-700"
          )}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "p-2 rounded hover:bg-gray-200 transition-colors",
            editor.isActive('underline') ? "bg-gray-200 text-primary-600" : "text-gray-700"
          )}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "p-2 rounded hover:bg-gray-200 transition-colors",
            editor.isActive('bulletList') ? "bg-gray-200 text-primary-600" : "text-gray-700"
          )}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "p-2 rounded hover:bg-gray-200 transition-colors",
            editor.isActive('orderedList') ? "bg-gray-200 text-primary-600" : "text-gray-700"
          )}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={setLink}
          className={cn(
            "p-2 rounded hover:bg-gray-200 transition-colors",
            editor.isActive('link') ? "bg-gray-200 text-primary-600" : "text-gray-700"
          )}
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Variable dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowVariableMenu((prev) => !prev)}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            Insert Variable
          </button>
          {showVariableMenu && (
            <>
              <button
                type="button"
                aria-label="Close variable menu"
                className="fixed inset-0 z-10"
                onClick={() => setShowVariableMenu(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="grid grid-cols-2 gap-1">
                  {variables.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => {
                        onInsertVariable(v.key)
                        setShowVariableMenu(false)
                      }}
                      className="text-left px-2 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                      title={v.description}
                    >
                      <span className="text-primary-600 font-mono">{v.key}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white min-h-[300px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [showTestModal, setShowTestModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/email-templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      } else {
        logger.serverAction('Failed to fetch templates:', res.status)
      }
    } catch (error) {
      logger.serverAction('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!editingTemplate) return
    
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/email-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTemplate.name,
          subject: editingTemplate.subject,
          content: editingTemplate.content,
          isActive: editingTemplate.isActive
        })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Template saved successfully!' })
        setEditingTemplate(null)
        setPreviewMode(false)
        fetchTemplates()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save template' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save template' })
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(template: EmailTemplate) {
    const newActive = !template.isActive
    
    try {
      const res = await fetch(`/api/email-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActive })
      })

      if (res.ok) {
        fetchTemplates()
      }
    } catch (error) {
      logger.serverAction('Failed to toggle template:', error)
    }
  }

  async function handleSendTest() {
    if (!testEmail || !editingTemplate) return
    
    setSendingTest(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/email-templates/${editingTemplate.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Test email sent successfully!' })
        setShowTestModal(false)
        setTestEmail('')
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to send test email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send test email' })
    } finally {
      setSendingTest(false)
    }
  }

  function handleInsertVariable(variable: string) {
    if (!editingTemplate) return
    setEditingTemplate({
      ...editingTemplate,
      content: editingTemplate.content + variable
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const groupedTemplates = templates.reduce((acc, template) => {
    const info = EMAIL_TEMPLATE_INFO[template.type as keyof typeof EMAIL_TEMPLATE_INFO]
    const category = info?.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(template)
    return acc
  }, {} as Record<string, EmailTemplate[]>)

  return (
    <div className="space-y-6">
      {message && (
        <div className={cn(
          "p-4 rounded-lg text-sm",
          message.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
        )}>
          {message.text}
        </div>
      )}

      {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryTemplates.map((template) => (
              <div
                key={template.id}
                className={cn(
                  "bg-white rounded-xl border p-5 transition-all",
                  template.isActive ? "border-gray-200" : "border-gray-100 bg-gray-50"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      template.isActive ? "bg-primary-100 text-primary-600" : "bg-gray-100 text-gray-400"
                    )}>
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-xs text-gray-500">{template.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(template)}
                    className={cn(
                      "text-sm font-medium transition-colors",
                      template.isActive ? "text-emerald-600 hover:text-emerald-700" : "text-gray-400 hover:text-gray-500"
                    )}
                    title={template.isActive ? 'Active - click to deactivate' : 'Inactive - click to activate'}
                  >
                    {template.isActive ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.subject}</p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingTemplate(template); setPreviewMode(false) }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => { setEditingTemplate(template); setPreviewMode(true); setShowTestModal(true) }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-primary-50 border border-primary-100 text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> Test
                  </button>
                </div>

                {template.isDefault && (
                  <p className="text-xs text-gray-400 mt-2 text-center">Default template</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit: {editingTemplate.name}</h2>
                <p className="text-sm text-gray-500">{editingTemplate.type}</p>
              </div>
              <button
                onClick={() => { setEditingTemplate(null); setPreviewMode(false) }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                <input
                  type="text"
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className={cn(STYLES.input, "w-full")}
                  placeholder="Email subject..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Content</label>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    {previewMode ? 'Edit' : 'Preview'}
                  </button>
                </div>
                
                {previewMode ? (
                  <div 
                    className="border border-gray-200 rounded-lg p-4 min-h-[300px] bg-white prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: editingTemplate.content }}
                  />
                ) : (
                  <RichTextEditor
                    content={editingTemplate.content}
                    onChange={(html) => setEditingTemplate({ ...editingTemplate, content: html })}
                    variables={EMAIL_VARIABLES}
                    onInsertVariable={(variable) => {
                      // Insert at cursor position - for now append to end
                      setEditingTemplate({
                        ...editingTemplate,
                        content: editingTemplate.content + variable
                      })
                    }}
                  />
                )}
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Use the toolbar above to format your text (bold, italic, lists, links)</li>
                  <li>• Click "Insert Variable" to add dynamic content like {"{{name}}"} or {"{{eventTitle}}"}</li>
                  <li>• These variables will be replaced with actual values when the email is sent</li>
                  <li>• Click "Preview" to see how your email will look</li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingTemplate.isActive}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Active (send emails using this template)</span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => { setEditingTemplate(null); setPreviewMode(false) }}
                  className={cn(STYLES.btn, "bg-gray-100 text-gray-700 hover:bg-gray-200")}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowTestModal(true)}
                  disabled={saving}
                  className={cn(STYLES.btn, "bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100")}
                >
                  Send Test
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(STYLES.btn, STYLES.btnPrimary, "flex items-center gap-2")}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Send Test Email</h2>
              <button
                onClick={() => { setShowTestModal(false); setTestEmail('') }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Send a test email to verify the <strong>{editingTemplate?.name}</strong> template works correctly.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Email Address</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className={cn(STYLES.input, "w-full")}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowTestModal(false); setTestEmail('') }}
                className={cn(STYLES.btn, "bg-gray-100 text-gray-700 hover:bg-gray-200")}
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !testEmail}
                className={cn(STYLES.btn, STYLES.btnPrimary, "flex items-center gap-2")}
              >
                {sendingTest && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Test Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
