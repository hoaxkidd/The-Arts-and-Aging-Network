'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  Strikethrough, List, ListOrdered,
  Undo, Redo
} from 'lucide-react'
import { cn } from '@/lib/utils'

type RichTextEditorProps = {
  content?: string
  onChange: (html: string, text: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export function RichTextEditor({ 
  content = '', 
  onChange, 
  placeholder = 'Type a message...',
  className,
  minHeight = '60px'
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()
      onChange(html, text)
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className={cn("border border-gray-300 rounded-lg overflow-hidden bg-white", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-1 border-b border-gray-200 bg-gray-50 flex-wrap">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "p-1.5 rounded hover:bg-gray-200 transition-colors",
            editor.isActive('bold') && "bg-gray-200 text-primary-600"
          )}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "p-1.5 rounded hover:bg-gray-200 transition-colors",
            editor.isActive('italic') && "bg-gray-200 text-primary-600"
          )}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "p-1.5 rounded hover:bg-gray-200 transition-colors",
            editor.isActive('underline') && "bg-gray-200 text-primary-600"
          )}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            "p-1.5 rounded hover:bg-gray-200 transition-colors",
            editor.isActive('strike') && "bg-gray-200 text-primary-600"
          )}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "p-1.5 rounded hover:bg-gray-200 transition-colors",
            editor.isActive('bulletList') && "bg-gray-200 text-primary-600"
          )}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "p-1.5 rounded hover:bg-gray-200 transition-colors",
            editor.isActive('orderedList') && "bg-gray-200 text-primary-600"
          )}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors disabled:opacity-30"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors disabled:opacity-30"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editor */}
      <EditorContent 
        editor={editor}
        className="px-3 py-2 overflow-y-auto"
        style={{ minHeight }}
      />
    </div>
  )
}
