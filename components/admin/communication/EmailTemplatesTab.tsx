'use client'

import { useEffect, useMemo, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Mail,
  Edit3,
  Send,
  X,
  Loader2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Paintbrush,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import {
  DEFAULT_EMAIL_STYLE_PRESET,
  EMAIL_TEMPLATE_INFO,
  type EmailStyleMode,
  type EmailStylePreset,
  type EmailVariable,
} from '@/lib/email/types'
import { logger } from '@/lib/logger'
import { InlineStatStrip } from '@/components/ui/InlineStatStrip'
import {
  parseStylePresetJson,
  sanitizeEmailStylePreset,
} from '@/lib/email/style-preset'

type EmailTemplate = {
  id: string
  type: string
  name: string
  subject: string
  content: string
  isActive: boolean
  isDefault: boolean
  styleMode: EmailStyleMode
  customStyleJson: string | null
  hasCustomStyle: boolean
}

const EMAIL_VARIABLES: EmailVariable[] = [
  { key: '{{name}}', description: 'Recipient name', example: 'John Doe' },
  { key: '{{appUrl}}', description: 'Application URL', example: 'https://artsandaging.com' },
  { key: '{{supportEmail}}', description: 'Support email', example: 'support@artsandaging.com' },
  { key: '{{inviteUrl}}', description: 'Invitation link', example: 'https://artsandaging.com/invite/abc123' },
  { key: '{{eventTitle}}', description: 'Booking title', example: 'Art Therapy Session' },
  { key: '{{eventDate}}', description: 'Booking date', example: 'January 15, 2024' },
  { key: '{{eventTime}}', description: 'Booking time', example: '2:00 PM' },
  { key: '{{eventLocation}}', description: 'Booking location', example: 'Sunrise Care Home' },
  { key: '{{eventLink}}', description: 'Booking details link', example: 'https://artsandaging.com/bookings/123' },
  { key: '{{message}}', description: 'Custom message', example: 'Thank you for signing up!' },
  { key: '{{role}}', description: 'User role', example: 'Staff' },
  { key: '{{expenseAmount}}', description: 'Expense amount', example: '$50.00' },
  { key: '{{timesheetWeek}}', description: 'Timesheet week', example: 'Week of Jan 15, 2024' },
  { key: '{{groupName}}', description: 'Group name', example: 'Art Volunteers' },
]

type UniversalPresetResponse = {
  id: string | null
  name: string
  style: EmailStylePreset
}

const TEMPLATE_RECT_BADGE = 'rounded-md px-2 py-1 text-[11px] font-semibold'

function StyledTemplateEditor({
  content,
  onChange,
  variables,
  style,
}: {
  content: string
  onChange: (html: string) => void
  variables: EmailVariable[]
  style: EmailStylePreset
}) {
  const [showVariableMenu, setShowVariableMenu] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start typing your email content...' }),
    ],
    content,
    onUpdate: ({ editor: activeEditor }) => {
      onChange(activeEditor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[260px] p-4',
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  if (!editor) return null

  const setEditorLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  const insertVariable = (variable: string) => {
    editor.chain().focus().insertContent(variable).run()
  }

  const contentWidth = `${style.contentMaxWidth}px`
  const sectionPadding = `${style.sectionPadding}px`
  const headerAlignment = style.headerAlign === 'left' ? 'text-left' : 'text-center'
  const bannerAlignment = style.bannerAlign === 'left' ? 'text-left' : 'text-center'

  return (
    <div className="h-full min-h-0 flex flex-col rounded-lg border border-gray-200 p-3" style={{ backgroundColor: style.bodyBackground }}>
      <div className="sticky top-0 z-10 flex items-center gap-1 p-2 bg-white border border-gray-200 rounded-t-lg border-b-0 flex-wrap">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            'p-2 rounded hover:bg-gray-200 transition-colors',
            editor.isActive('bold') ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
          )}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            'p-2 rounded hover:bg-gray-200 transition-colors',
            editor.isActive('italic') ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
          )}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            'p-2 rounded hover:bg-gray-200 transition-colors',
            editor.isActive('underline') ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
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
            'p-2 rounded hover:bg-gray-200 transition-colors',
            editor.isActive('bulletList') ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
          )}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            'p-2 rounded hover:bg-gray-200 transition-colors',
            editor.isActive('orderedList') ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
          )}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={setEditorLink}
          className={cn(
            'p-2 rounded hover:bg-gray-200 transition-colors',
            editor.isActive('link') ? 'bg-gray-200 text-primary-600' : 'text-gray-700'
          )}
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

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
              <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="grid grid-cols-2 gap-1">
                  {variables.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => {
                        insertVariable(variable.key)
                        setShowVariableMenu(false)
                      }}
                      className="text-left px-2 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                      title={variable.description}
                    >
                      <span className="text-primary-600 font-mono">{variable.key}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-b-lg border border-gray-200 p-4" style={{ backgroundColor: style.bodyBackground }}>
        <div
          className="mx-auto h-full min-h-0 overflow-hidden border border-gray-200 shadow-sm flex flex-col"
          style={{
            maxWidth: contentWidth,
            borderRadius: `${style.borderRadius}px`,
            backgroundColor: style.surfaceBackground,
          }}
        >
          {style.showBanner && (
            <div
              className={cn('px-6', bannerAlignment)}
              style={{
                paddingTop: `${style.bannerPadding}px`,
                paddingBottom: `${style.bannerPadding}px`,
                color: style.bannerTextColor,
                background: `linear-gradient(135deg, ${style.bannerBackgroundStart} 0%, ${style.bannerBackgroundEnd} 100%)`,
              }}
            >
              <div className="font-semibold text-lg">{style.bannerTitle}</div>
              {style.bannerSubtitle ? <div className="mt-1 text-xs opacity-90">{style.bannerSubtitle}</div> : null}
            </div>
          )}

          {style.showHeader && (
            <div
              className={cn('px-6', headerAlignment)}
              style={{
                paddingTop: sectionPadding,
                paddingBottom: sectionPadding,
                backgroundColor: style.headerBackgroundColor,
                borderBottom: style.showHeaderDivider ? '1px solid #e5e7eb' : 'none',
              }}
            >
              <div
                style={{
                  color: style.headerTextColor,
                  fontSize: `${style.headerTitleSize}px`,
                  fontWeight: style.headerWeight,
                }}
              >
                {style.headerTitle}
              </div>
            </div>
          )}

          <div
            className="flex-1 min-h-0 overflow-hidden"
            style={{
              padding: sectionPadding,
              fontFamily: style.fontFamily,
              color: style.textColor,
              fontSize: `${style.bodyFontSize}px`,
              lineHeight: style.bodyLineHeight,
              backgroundColor: style.surfaceBackground,
            }}
          >
            <style>{`
              .template-editor-body a { color: ${style.linkColor}; }
              .template-editor-body h1, .template-editor-body h2, .template-editor-body h3, .template-editor-body h4 { color: ${style.headingColor}; }
              .template-editor-body p { margin: 0 0 ${style.paragraphSpacing}px 0; }
              .template-editor-body hr { border: 0; border-top: 1px solid #e5e7eb; margin: ${style.paragraphSpacing}px 0; display: ${style.showSectionDividers ? 'block' : 'none'}; }
              .template-editor-body .btn, .template-editor-body button, .template-editor-body a.button {
                background: ${style.buttonColor};
                color: ${style.buttonTextColor};
                border-radius: ${style.buttonRadius}px;
                border: ${style.buttonBorderWidth}px solid ${style.buttonBorderColor};
                padding: ${style.buttonPaddingY}px ${style.buttonPaddingX}px;
                text-decoration: none;
                display: inline-block;
              }
            `}</style>
            <div className="template-editor-body h-full min-h-0 overflow-y-auto custom-scrollbar rounded-md border border-dashed border-gray-200 bg-white">
              <EditorContent editor={editor} />
            </div>

            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Rendered Buttons Preview</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  style={{
                    backgroundColor: style.buttonColor,
                    color: style.buttonTextColor,
                    borderRadius: `${style.buttonRadius}px`,
                    border: `${style.buttonBorderWidth}px solid ${style.buttonBorderColor}`,
                    padding: `${style.buttonPaddingY}px ${style.buttonPaddingX}px`,
                  }}
                  className="text-sm font-medium"
                >
                  Primary CTA
                </button>
                <button
                  type="button"
                  style={{
                    backgroundColor: '#ffffff',
                    color: style.buttonColor,
                    borderRadius: `${style.buttonRadius}px`,
                    border: `1px solid ${style.buttonColor}`,
                    padding: `${style.buttonPaddingY}px ${style.buttonPaddingX}px`,
                  }}
                  className="text-sm font-medium"
                >
                  Secondary CTA
                </button>
              </div>
            </div>
          </div>

          {style.showFooter && (
            <div
              className="px-6 text-center text-xs"
              style={{
                paddingTop: sectionPadding,
                paddingBottom: sectionPadding,
                color: style.footerTextColor,
                backgroundColor: style.footerBackgroundColor,
                borderTop: style.footerDivider ? '1px solid #e5e7eb' : 'none',
              }}
            >
              {style.footerText}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StyleControls({
  value,
  onChange,
}: {
  value: EmailStylePreset
  onChange: (next: EmailStylePreset) => void
}) {
  const update = <K extends keyof EmailStylePreset>(key: K, nextValue: EmailStylePreset[K]) => {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Paintbrush className="h-4 w-4 text-primary-600" />
        Style Controls
      </h4>
      <p className="text-xs text-gray-500">Update the brand look, typography, buttons, and structure. Changes appear instantly on the left.</p>

      <div className="rounded-md border border-gray-200 bg-white p-3 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Brand & Surface</p>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={value.showBanner} onChange={(e) => update('showBanner', e.target.checked)} className="rounded border-gray-300" />
            Show banner
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-700">Title<input type="text" value={value.bannerTitle} onChange={(e) => update('bannerTitle', e.target.value)} className={cn(STYLES.input, 'mt-1 h-8 text-xs')} /></label>
          <label className="text-xs text-gray-700">Subtitle<input type="text" value={value.bannerSubtitle} onChange={(e) => update('bannerSubtitle', e.target.value)} className={cn(STYLES.input, 'mt-1 h-8 text-xs')} /></label>
          <label className="text-xs text-gray-700">Gradient start<input type="color" value={value.bannerBackgroundStart} onChange={(e) => update('bannerBackgroundStart', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Gradient end<input type="color" value={value.bannerBackgroundEnd} onChange={(e) => update('bannerBackgroundEnd', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Text color<input type="color" value={value.bannerTextColor} onChange={(e) => update('bannerTextColor', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Alignment
            <select value={value.bannerAlign} onChange={(e) => update('bannerAlign', e.target.value as EmailStylePreset['bannerAlign'])} className={cn(STYLES.input, STYLES.select, 'mt-1 h-8 text-xs')}>
              <option value="center">Center</option>
              <option value="left">Left</option>
            </select>
          </label>
          <label className="text-xs text-gray-700">Page background<input type="color" value={value.bodyBackground} onChange={(e) => update('bodyBackground', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Card surface<input type="color" value={value.surfaceBackground} onChange={(e) => update('surfaceBackground', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Content width ({value.contentMaxWidth}px)<input type="range" min={480} max={900} step={10} value={value.contentMaxWidth} onChange={(e) => update('contentMaxWidth', Number(e.target.value))} className="mt-1 w-full" /></label>
          <label className="text-xs text-gray-700">Section padding ({value.sectionPadding}px)<input type="range" min={12} max={48} value={value.sectionPadding} onChange={(e) => update('sectionPadding', Number(e.target.value))} className="mt-1 w-full" /></label>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-3 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Typography</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-700">Header title<input type="text" value={value.headerTitle} onChange={(e) => update('headerTitle', e.target.value)} className={cn(STYLES.input, 'mt-1 h-8 text-xs')} /></label>
          <label className="text-xs text-gray-700">Header background<input type="color" value={value.headerBackgroundColor} onChange={(e) => update('headerBackgroundColor', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Header text color<input type="color" value={value.headerTextColor} onChange={(e) => update('headerTextColor', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Body heading color<input type="color" value={value.headingColor} onChange={(e) => update('headingColor', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Text color<input type="color" value={value.textColor} onChange={(e) => update('textColor', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Link color<input type="color" value={value.linkColor} onChange={(e) => update('linkColor', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Header align
            <select value={value.headerAlign} onChange={(e) => update('headerAlign', e.target.value as EmailStylePreset['headerAlign'])} className={cn(STYLES.input, STYLES.select, 'mt-1 h-8 text-xs')}>
              <option value="center">Center</option>
              <option value="left">Left</option>
            </select>
          </label>
        </div>
        <p className="text-[11px] text-gray-500">Header text color does not affect body headings.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-700">Header size ({value.headerTitleSize}px)<input type="range" min={14} max={36} value={value.headerTitleSize} onChange={(e) => update('headerTitleSize', Number(e.target.value))} className="mt-1 w-full" /></label>
          <label className="text-xs text-gray-700">Body size ({value.bodyFontSize}px)<input type="range" min={12} max={20} value={value.bodyFontSize} onChange={(e) => update('bodyFontSize', Number(e.target.value))} className="mt-1 w-full" /></label>
          <label className="text-xs text-gray-700">Line height ({value.bodyLineHeight.toFixed(1)})<input type="range" min={1.2} max={2} step={0.1} value={value.bodyLineHeight} onChange={(e) => update('bodyLineHeight', Number(e.target.value))} className="mt-1 w-full" /></label>
          <label className="text-xs text-gray-700">Paragraph spacing ({value.paragraphSpacing}px)<input type="range" min={6} max={30} value={value.paragraphSpacing} onChange={(e) => update('paragraphSpacing', Number(e.target.value))} className="mt-1 w-full" /></label>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-3 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Buttons</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-700">Button color<input type="color" value={value.buttonColor} onChange={(e) => update('buttonColor', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Button text<input type="color" value={value.buttonTextColor} onChange={(e) => update('buttonTextColor', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Button border<input type="color" value={value.buttonBorderColor} onChange={(e) => update('buttonBorderColor', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Border width ({value.buttonBorderWidth}px)<input type="range" min={0} max={3} step={1} value={value.buttonBorderWidth} onChange={(e) => update('buttonBorderWidth', Number(e.target.value))} className="mt-1 w-full" /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-700">Button radius ({value.buttonRadius}px)<input type="range" min={0} max={20} value={value.buttonRadius} onChange={(e) => update('buttonRadius', Number(e.target.value))} className="mt-1 w-full" /></label>
          <div />
          <label className="text-xs text-gray-700">Button pad X ({value.buttonPaddingX}px)<input type="range" min={12} max={40} step={1} value={value.buttonPaddingX} onChange={(e) => update('buttonPaddingX', Number(e.target.value))} className="mt-1 w-full" /></label>
          <label className="text-xs text-gray-700">Button pad Y ({value.buttonPaddingY}px)<input type="range" min={8} max={20} step={1} value={value.buttonPaddingY} onChange={(e) => update('buttonPaddingY', Number(e.target.value))} className="mt-1 w-full" /></label>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-3 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Structure</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-700">Footer text<input type="text" value={value.footerText} onChange={(e) => update('footerText', e.target.value)} className={cn(STYLES.input, 'mt-1 h-8 text-xs')} /></label>
          <label className="text-xs text-gray-700">Footer background<input type="color" value={value.footerBackgroundColor} onChange={(e) => update('footerBackgroundColor', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Footer text color<input type="color" value={value.footerTextColor} onChange={(e) => update('footerTextColor', e.target.value)} className="mt-1 h-8 w-full rounded border border-gray-300" /></label>
          <label className="text-xs text-gray-700">Card radius ({value.borderRadius}px)<input type="range" min={0} max={28} value={value.borderRadius} onChange={(e) => update('borderRadius', Number(e.target.value))} className="mt-1 w-full" /></label>
          <label className="inline-flex items-center gap-2 text-xs text-gray-700 mt-5"><input type="checkbox" checked={value.showSectionDividers} onChange={(e) => update('showSectionDividers', e.target.checked)} className="rounded border-gray-300" />Section dividers</label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={value.showHeader} onChange={(e) => update('showHeader', e.target.checked)} className="rounded border-gray-300" />Show header</label>
          <label className="inline-flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={value.showFooter} onChange={(e) => update('showFooter', e.target.checked)} className="rounded border-gray-300" />Show footer</label>
          <label className="inline-flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={value.showHeaderDivider} onChange={(e) => update('showHeaderDivider', e.target.checked)} className="rounded border-gray-300" />Header divider</label>
          <label className="inline-flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={value.footerDivider} onChange={(e) => update('footerDivider', e.target.checked)} className="rounded border-gray-300" />Footer divider</label>
        </div>
      </div>
    </div>
  )
}

export function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [showTestModal, setShowTestModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [universalPreset, setUniversalPreset] = useState<EmailStylePreset>(DEFAULT_EMAIL_STYLE_PRESET)
  const [customStyleDraft, setCustomStyleDraft] = useState<EmailStylePreset>(DEFAULT_EMAIL_STYLE_PRESET)

  useEffect(() => {
    fetchTemplates()
    fetchUniversalPreset()
  }, [])

  useEffect(() => {
    if (!editingTemplate) return
    if (editingTemplate.styleMode === 'CUSTOM' && editingTemplate.customStyleJson) {
      setCustomStyleDraft(parseStylePresetJson(editingTemplate.customStyleJson))
      return
    }
    setCustomStyleDraft(universalPreset)
  }, [editingTemplate, universalPreset])

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

  async function fetchUniversalPreset() {
    try {
      const res = await fetch('/api/email-templates/style-preset')
      if (!res.ok) return
      const data = (await res.json()) as UniversalPresetResponse
      setUniversalPreset(sanitizeEmailStylePreset(data.style))
    } catch (error) {
      logger.serverAction('Failed to fetch universal style preset:', error)
    }
  }

  async function handleSaveTemplate() {
    if (!editingTemplate) return

    setSaving(true)
    setMessage(null)
    try {
      const payload: Record<string, unknown> = {
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        content: editingTemplate.content,
        isActive: editingTemplate.isActive,
        styleMode: editingTemplate.styleMode,
      }

      if (editingTemplate.styleMode === 'CUSTOM') {
        payload.customStyleJson = JSON.stringify(sanitizeEmailStylePreset(customStyleDraft))
      }

      const res = await fetch(`/api/email-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save template' })
        return
      }

      setMessage({ type: 'success', text: 'Template saved successfully.' })
      setEditingTemplate(null)
      await fetchTemplates()
    } catch (error) {
      logger.serverAction('Failed to save template:', error)
      setMessage({ type: 'error', text: 'Failed to save template' })
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(template: EmailTemplate) {
    try {
      const res = await fetch(`/api/email-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !template.isActive }),
      })
      if (res.ok) await fetchTemplates()
    } catch (error) {
      logger.serverAction('Failed to toggle template active state:', error)
    }
  }

  async function handleSetMode(template: EmailTemplate, mode: EmailStyleMode) {
    try {
      const payload: Record<string, unknown> = { styleMode: mode }
      if (mode === 'UNIVERSAL') payload.resetCustomStyle = true

      const res = await fetch(`/api/email-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to update style mode' })
        return
      }

      setMessage({ type: 'success', text: `${template.name} now uses ${mode === 'UNIVERSAL' ? 'universal' : 'custom'} styling.` })
      await fetchTemplates()
    } catch (error) {
      logger.serverAction('Failed to update style mode:', error)
      setMessage({ type: 'error', text: 'Failed to update style mode' })
    }
  }

  async function handleResetTemplate(template: EmailTemplate) {
    const confirmed = window.confirm(`Reset ${template.name} to default content and universal style mode?`)
    if (!confirmed) return

    try {
      const res = await fetch(`/api/email-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToDefault: true }),
      })

      if (!res.ok) {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to reset template' })
        return
      }

      setMessage({ type: 'success', text: `${template.name} reset to default content.` })
      await fetchTemplates()
    } catch (error) {
      logger.serverAction('Failed to reset template:', error)
      setMessage({ type: 'error', text: 'Failed to reset template' })
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
        body: JSON.stringify({ testEmail }),
      })

      if (!res.ok) {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to send test email' })
        return
      }

      setMessage({ type: 'success', text: 'Test email sent successfully.' })
      setShowTestModal(false)
      setTestEmail('')
    } catch (error) {
      logger.serverAction('Failed to send test email:', error)
      setMessage({ type: 'error', text: 'Failed to send test email' })
    } finally {
      setSendingTest(false)
    }
  }

  const groupedTemplates = useMemo(() => {
    return templates.reduce((acc, template) => {
      const info = EMAIL_TEMPLATE_INFO[template.type as keyof typeof EMAIL_TEMPLATE_INFO]
      const category = info?.category || 'Other'
      if (!acc[category]) acc[category] = []
      acc[category].push(template)
      return acc
    }, {} as Record<string, EmailTemplate[]>)
  }, [templates])

  const activeCount = templates.filter((template) => template.isActive).length
  const inactiveCount = templates.length - activeCount
  const customCount = templates.filter((template) => template.styleMode === 'CUSTOM').length

  const resolvedEditorStyle = editingTemplate?.styleMode === 'CUSTOM'
    ? sanitizeEmailStylePreset(customStyleDraft)
    : sanitizeEmailStylePreset(universalPreset)

  if (loading) {
    return (
      <div className={cn(STYLES.card, 'py-16 flex items-center justify-center')}>
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className={cn(STYLES.pageTemplateRoot, 'space-y-5')}>
      <InlineStatStrip
        items={[
          { label: 'Templates', value: templates.length },
          { label: 'Active', value: activeCount, tone: 'success' },
          { label: 'Inactive', value: inactiveCount, tone: 'warning' },
          { label: 'Custom style', value: customCount, tone: 'info' },
        ]}
      />

      {message && (
        <div
          className={cn(
            'p-4 rounded-lg text-sm',
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          )}
        >
          {message.text}
        </div>
      )}

      {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
        <div key={category} className={cn(STYLES.card, 'p-4 sm:p-5')}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {categoryTemplates.map((template) => (
              <div
                key={template.id}
                className={cn(
                  'rounded-xl border p-5 transition-all shadow-sm',
                  template.isActive ? 'border-gray-200 bg-white hover:shadow' : 'border-gray-100 bg-gray-50'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className={cn('w-5 h-5', template.isActive ? 'text-primary-600' : 'text-gray-400')} />
                    <div>
                      <h4 className="font-medium text-gray-900 leading-tight">{template.name}</h4>
                      <p className="text-xs text-gray-500">{template.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(template)}
                    className={cn(
                      'text-sm font-medium transition-colors',
                      template.isActive ? 'text-emerald-600 hover:text-emerald-700' : 'text-gray-400 hover:text-gray-500'
                    )}
                    title={template.isActive ? 'Deactivate template' : 'Activate template'}
                  >
                    {template.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  <span className={cn(STYLES.badge, TEMPLATE_RECT_BADGE, template.isActive ? STYLES.badgeSuccess : STYLES.badgeNeutral)}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span
                    className={cn(
                      STYLES.badge,
                      TEMPLATE_RECT_BADGE,
                      template.styleMode === 'CUSTOM' ? STYLES.badgeInfo : STYLES.badgeWarning
                    )}
                  >
                    {template.styleMode === 'CUSTOM' ? 'Custom style' : 'Universal style'}
                  </span>
                  {template.isDefault && <span className={cn(STYLES.badge, TEMPLATE_RECT_BADGE, STYLES.badgeNeutral)}>Default source</span>}
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.subject}</p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setEditingTemplate(template)
                    }}
                    className={cn(STYLES.btn, STYLES.btnSecondary, 'h-9 px-3 py-0 text-xs')}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      setEditingTemplate(template)
                      setShowTestModal(true)
                    }}
                    className={cn(STYLES.btn, STYLES.btnPrimary, 'h-9 px-3 py-0 text-xs')}
                  >
                    <Send className="w-3.5 h-3.5" /> Test
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleResetTemplate(template)}
                    className={cn(STYLES.btn, STYLES.btnSecondary, 'h-8 px-2 py-0 text-[11px]')}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset
                  </button>
                  <button
                    onClick={() => handleSetMode(template, 'UNIVERSAL')}
                    className={cn(
                      STYLES.btn,
                      template.styleMode === 'UNIVERSAL' ? STYLES.btnPrimary : STYLES.btnSecondary,
                      'h-8 px-2 py-0 text-[11px]'
                    )}
                  >
                    Universal
                  </button>
                  <button
                    onClick={() => handleSetMode(template, 'CUSTOM')}
                    className={cn(
                      STYLES.btn,
                      template.styleMode === 'CUSTOM' ? STYLES.btnPrimary : STYLES.btnSecondary,
                      'h-8 px-2 py-0 text-[11px]'
                    )}
                  >
                    Custom
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-6xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit: {editingTemplate.name}</h2>
                <p className="text-sm text-gray-500">{editingTemplate.type}</p>
              </div>
              <button
                onClick={() => {
                  setEditingTemplate(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden p-6">
              <div className="h-full min-h-0 grid grid-rows-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
                <div className="min-h-0 overflow-hidden">
                  <StyledTemplateEditor
                    content={editingTemplate.content}
                    onChange={(html) => setEditingTemplate({ ...editingTemplate, content: html })}
                    variables={EMAIL_VARIABLES}
                    style={resolvedEditorStyle}
                  />
                </div>

                <div className="min-h-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-3">
                  <div className="rounded-lg border border-gray-200 p-3 bg-white">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Subject Line</label>
                    <input
                      type="text"
                      value={editingTemplate.subject}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                      className={cn(STYLES.input, 'w-full h-9 text-sm')}
                      placeholder="Email subject..."
                    />
                  </div>

                  <div className="rounded-lg border border-gray-200 p-3 bg-white">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Style strategy</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingTemplate({ ...editingTemplate, styleMode: 'UNIVERSAL' })}
                        className={cn(
                          STYLES.btn,
                          editingTemplate.styleMode === 'UNIVERSAL' ? STYLES.btnPrimary : STYLES.btnSecondary,
                          'h-8 px-2 py-0 text-xs'
                        )}
                      >
                        Universal
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTemplate({ ...editingTemplate, styleMode: 'CUSTOM' })}
                        className={cn(
                          STYLES.btn,
                          editingTemplate.styleMode === 'CUSTOM' ? STYLES.btnPrimary : STYLES.btnSecondary,
                          'h-8 px-2 py-0 text-xs'
                        )}
                      >
                        Custom
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Universal mode inherits global styling. Custom mode stores per-template style.
                    </p>
                  </div>

                  <div className="flex-1 h-0 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-3 space-y-3">
                    {editingTemplate.styleMode === 'CUSTOM' ? (
                      <StyleControls value={customStyleDraft} onChange={setCustomStyleDraft} />
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-2">
                        <p className="font-semibold">Universal style active</p>
                        <p className="text-xs">
                          This template follows the global preset. Switch to Custom if you need unique styling.
                        </p>
                      </div>
                    )}

                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Tips</h4>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>Use placeholders like {'{{name}}'} and {'{{eventTitle}}'} for dynamic content.</li>
                        <li>Changes in style controls are reflected on the left editor instantly.</li>
                        <li>Universal overwrite updates styling only and preserves subject/body copy.</li>
                      </ul>
                    </div>
                  </div>
                </div>
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
                  onClick={() => {
                    setEditingTemplate(null)
                  }}
                  className={cn(STYLES.btn, STYLES.btnSecondary, 'h-10 px-4 py-0')}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowTestModal(true)}
                  disabled={saving}
                  className={cn(STYLES.btn, STYLES.btnSecondary, 'h-10 px-4 py-0')}
                >
                  <Send className="h-4 w-4" /> Send Test
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={saving}
                  className={cn(STYLES.btn, STYLES.btnPrimary, 'h-10 px-4 py-0 flex items-center gap-2')}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Send Test Email</h2>
              <button
                onClick={() => {
                  setShowTestModal(false)
                  setTestEmail('')
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Send a test email to verify the <strong>{editingTemplate?.name}</strong> template.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Email Address</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className={cn(STYLES.input, 'w-full')}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTestModal(false)
                  setTestEmail('')
                }}
                className={cn(STYLES.btn, STYLES.btnSecondary, 'h-10 px-4 py-0')}
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !testEmail}
                className={cn(STYLES.btn, STYLES.btnPrimary, 'h-10 px-4 py-0 flex items-center gap-2')}
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
