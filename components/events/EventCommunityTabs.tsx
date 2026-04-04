'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import EmojiPicker from 'emoji-picker-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import {
  MessageSquare,
  Image as ImageIcon,
  Star,
  Send,
  Upload,
  Trash2,
  User,
  ThumbsUp,
  Heart,
  ThumbsDown,
  Reply,
  Edit2,
  MoreVertical,
  X,
  Loader2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Smile
} from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/dompurify'
import { submitFeedback } from '@/app/actions/engagement'
import {
  addComment,
  editComment,
  deleteComment as deleteCommentNew,
  deleteEventPhoto,
  toggleReaction,
  uploadEventPhoto,
} from '@/app/actions/event-engagement'

type Reaction = {
  id: string
  type: string // 'LIKE' | 'HEART' | 'DOWNVOTE'
  userId: string
  user?: { id: string; name: string | null }
}

interface Photo {
  id: string
  url: string
  caption: string | null
  uploader: { name: string | null; id?: string }
  uploaderId: string
  createdAt?: Date | string
  reactions?: Reaction[]
}

interface Comment {
  id: string
  content: string
  createdAt: Date | string
  updatedAt?: Date | string
  user: { name: string | null; id?: string; image?: string | null; role?: string }
  userId: string
  reactions?: Reaction[]
  replies?: Comment[]
  parentId?: string | null
}

interface Props {
  eventId: string
  description: string
  photos: Photo[]
  comments: Comment[]
  currentUserId: string
  canManage: boolean
  userAttendance?: {
    status: string
    feedbackRating: number | null
  }
}

function stripHtmlTags(content: string): string {
  return content.replace(/<[^>]*>/g, '').trim()
}

function toSafeCommentHtml(content: string): string {
  const normalized = /<[^>]+>/.test(content) ? content : content.replace(/\n/g, '<br />')
  return sanitizeHtml(normalized)
}

// Reaction Buttons Component
function ReactionButtons({
  reactions = [],
  currentUserId,
  onReact,
  isPending
}: {
  reactions: Reaction[]
  currentUserId: string
  onReact: (type: 'LIKE' | 'HEART' | 'DOWNVOTE') => void
  isPending: boolean
}) {
  const likeCount = reactions.filter(r => r.type === 'LIKE').length
  const heartCount = reactions.filter(r => r.type === 'HEART').length
  const downvoteCount = reactions.filter(r => r.type === 'DOWNVOTE').length
  const userReaction = reactions.find(r => r.userId === currentUserId)?.type

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onReact('LIKE')}
        disabled={isPending}
        className={cn(
          "flex items-center gap-1 p-1 text-xs rounded-full transition-colors",
          userReaction === 'LIKE'
            ? "bg-blue-100 text-blue-600"
            : "text-gray-500 hover:bg-gray-100"
        )}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>
      <button
        onClick={() => onReact('HEART')}
        disabled={isPending}
        className={cn(
          "flex items-center gap-1 p-1 text-xs rounded-full transition-colors",
          userReaction === 'HEART'
            ? "bg-red-100 text-red-500"
            : "text-gray-500 hover:bg-gray-100"
        )}
      >
        <Heart className={cn("w-3.5 h-3.5", userReaction === 'HEART' && "fill-current")} />
        {heartCount > 0 && <span>{heartCount}</span>}
      </button>
      <button
        onClick={() => onReact('DOWNVOTE')}
        disabled={isPending}
        className={cn(
          "flex items-center gap-1 p-1 text-xs rounded-full transition-colors",
          userReaction === 'DOWNVOTE'
            ? "bg-gray-200 text-gray-700"
            : "text-gray-500 hover:bg-gray-100"
        )}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        {downvoteCount > 0 && <span>{downvoteCount}</span>}
      </button>
    </div>
  )
}

// Single Comment Component
function CommentItem({
  comment,
  eventId,
  currentUserId,
  canManage,
  onReply,
  depth = 0
}: {
  comment: Comment
  eventId: string
  currentUserId: string
  canManage: boolean
  onReply?: (commentId: string) => void
  depth?: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(stripHtmlTags(comment.content))
  const [showMenu, setShowMenu] = useState(false)

  const isOwner = comment.userId === currentUserId
  const canEdit = isOwner
  const canDelete = isOwner || canManage

  const createdAt = new Date(comment.createdAt)
  const updatedAt = comment.updatedAt ? new Date(comment.updatedAt) : createdAt
  const wasEdited = updatedAt > createdAt

  const handleEdit = () => {
    if (!editedContent.trim()) return
    startTransition(async () => {
      const result = await editComment(comment.id, editedContent)
      if (!result.error) {
        setIsEditing(false)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    if (!confirm('Delete this comment?')) return
    startTransition(async () => {
      await deleteCommentNew(comment.id)
      router.refresh()
    })
  }

  const handleReaction = (type: 'LIKE' | 'HEART' | 'DOWNVOTE') => {
    startTransition(async () => {
      await toggleReaction(type, comment.id)
      router.refresh()
    })
  }

  return (
    <div className={cn("group", depth > 0 && "ml-8 border-l-2 border-gray-100 pl-4")}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs shrink-0">
          {comment.user.name?.[0] || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{comment.user.name}</span>
            {comment.user.role && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                {comment.user.role}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} at{' '}
              {createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
            {wasEdited && <span className="text-xs text-gray-400">(edited)</span>}
          </div>

          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className={cn(STYLES.input, "h-16 resize-none text-sm")}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleEdit}
                  disabled={isPending}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditedContent(stripHtmlTags(comment.content))
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className="mt-1 text-sm text-gray-700 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5"
              dangerouslySetInnerHTML={{ __html: toSafeCommentHtml(comment.content) }}
            />
          )}

          {!isEditing && (
            <div className="flex items-center gap-3 mt-2">
              <ReactionButtons
                reactions={comment.reactions || []}
                currentUserId={currentUserId}
                onReact={handleReaction}
                isPending={isPending}
              />

              {depth === 0 && onReply && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  <Reply className="w-3.5 h-3.5" />
                  Reply
                </button>
              )}

              {(canEdit || canDelete) && (
                <div className="relative ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 w-28 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setIsEditing(true)
                              setShowMenu(false)
                            }}
                            className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              handleDelete()
                              setShowMenu(false)
                            }}
                            className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              eventId={eventId}
              currentUserId={currentUserId}
              canManage={canManage}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Discussion Tab Component
function DiscussionTab({
  comments,
  eventId,
  currentUserId,
  canManage
}: {
  comments: Comment[]
  eventId: string
  currentUserId: string
  canManage: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [composerText, setComposerText] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Write a comment for the event community...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[56px] text-gray-800',
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      setComposerText(nextEditor.getText())
    },
  })

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editor) return
    const text = editor.getText().trim()
    if (!text) return
    const html = editor.getHTML()

    startTransition(async () => {
      await addComment(eventId, html)
      editor.commands.clearContent()
      setShowEmojiPicker(false)
      router.refresh()
    })
  }

  const handleSubmitReply = (parentId: string) => {
    if (!replyContent.trim()) return

    startTransition(async () => {
      await addComment(eventId, replyContent, parentId)
      setReplyContent('')
      setReplyingTo(null)
      router.refresh()
    })
  }

  // Filter to only show top-level comments (no parentId)
  const topLevelComments = comments.filter(c => !c.parentId)
  const canSubmit = !!composerText.trim()

  return (
    <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-300 rounded-xl border border-gray-200 bg-white">
      {/* Comments List */}
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5">
        {topLevelComments.length === 0 ? (
          <div className="text-center py-10 text-gray-500 italic border border-dashed border-gray-200 rounded-xl bg-gray-50/60">
            No comments yet. Start the conversation!
          </div>
        ) : (
          topLevelComments.map(comment => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                eventId={eventId}
                currentUserId={currentUserId}
                canManage={canManage}
                onReply={(id) => setReplyingTo(id)}
              />
              {replyingTo === comment.id && (
                <div className="ml-11 mt-3 flex gap-2">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`Reply to ${comment.user.name}...`}
                    className={cn(STYLES.input, "flex-1 text-sm")}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={isPending || !replyContent.trim()}
                    className={cn(STYLES.btn, STYLES.btnPrimary, "px-2 py-1")}
                  >
                    <Send className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyContent('')
                    }}
                    className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white p-2.5 sm:p-3 flex-shrink-0">
        <form onSubmit={handleSubmitComment} className="space-y-2.5">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  editor?.isActive('bold') ? "bg-gray-200 text-primary-700" : "text-gray-600 hover:bg-gray-100"
                )}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  editor?.isActive('italic') ? "bg-gray-200 text-primary-700" : "text-gray-600 hover:bg-gray-100"
                )}
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  editor?.isActive('underline') ? "bg-gray-200 text-primary-700" : "text-gray-600 hover:bg-gray-100"
                )}
                title="Underline"
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  editor?.isActive('bulletList') ? "bg-gray-200 text-primary-700" : "text-gray-600 hover:bg-gray-100"
                )}
                title="Bullet list"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  editor?.isActive('orderedList') ? "bg-gray-200 text-primary-700" : "text-gray-600 hover:bg-gray-100"
                )}
                title="Numbered list"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
          </div>

          <div className="flex items-end gap-2">
            <div className="relative flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-primary-100 focus-within:border-primary-400">
              <EditorContent editor={editor} />
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="absolute right-2 bottom-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100"
                title="Add emoji"
              >
                <Smile className="w-3.5 h-3.5" /> Emoji
              </button>
              {showEmojiPicker && (
                <div className="absolute right-2 bottom-11 z-30 shadow-xl border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      editor?.chain().focus().insertContent(emojiData.emoji).run()
                      setShowEmojiPicker(false)
                    }}
                    lazyLoadEmojis
                    width={280}
                    height={320}
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isPending || !canSubmit}
              className={cn(STYLES.btn, STYLES.btnPrimary, "px-4 py-2 text-sm whitespace-nowrap")}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EventCommunityTabs({ 
  eventId, 
  description,
  photos, 
  comments, 
  currentUserId, 
  canManage,
  userAttendance 
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'details' | 'discussion' | 'photos' | 'feedback'>('details')
  const [isPhotoPending, startPhotoTransition] = useTransition()
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [photoCaption, setPhotoCaption] = useState('')
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const detailsText = description?.trim() || "No description provided for this event."
  const detailsPreviewLimit = 360
  const shouldTruncateDetails = detailsText.length > detailsPreviewLimit
  const visibleDetailsText = shouldTruncateDetails && !detailsExpanded
    ? `${detailsText.slice(0, detailsPreviewLimit).trimEnd()}...`
    : detailsText

  const handlePhotoUpload = (e: React.FormEvent) => {
    e.preventDefault()
    setPhotoError(null)

    if (!selectedPhotoFile) {
      setPhotoError('Please select a photo to upload.')
      return
    }

    startPhotoTransition(async () => {
      const formData = new FormData()
      formData.set('eventId', eventId)
      formData.set('photo', selectedPhotoFile)
      formData.set('caption', photoCaption.trim())

      const result = await uploadEventPhoto(formData)
      if (result?.error) {
        setPhotoError(result.error)
        return
      }

      setSelectedPhotoFile(null)
      setPhotoCaption('')
      setFileInputKey((prev) => prev + 1)
      router.refresh()
    })
  }

  // Optimistic UI could be added here, but for now we rely on Server Actions + revalidatePath
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-full shadow-sm">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-100 overflow-x-auto bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
        <button
          onClick={() => setActiveTab('details')}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all whitespace-nowrap outline-none focus:bg-gray-50",
            activeTab === 'details' ? "border-primary-600 text-primary-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/70"
          )}
        >
          <User className="w-4 h-4" /> Details
        </button>
        <button
          onClick={() => setActiveTab('discussion')}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all whitespace-nowrap outline-none focus:bg-gray-50",
            activeTab === 'discussion' ? "border-primary-600 text-primary-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/70"
          )}
        >
          <MessageSquare className="w-4 h-4" /> Discussion
          <span className={cn("px-1.5 py-0.5 rounded-full text-xs transition-colors", activeTab === 'discussion' ? "bg-primary-100 text-primary-700" : "bg-gray-200 text-gray-600")}>{comments.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all whitespace-nowrap outline-none focus:bg-gray-50",
            activeTab === 'photos' ? "border-primary-600 text-primary-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/70"
          )}
        >
          <ImageIcon className="w-4 h-4" /> Photos
          <span className={cn("px-1.5 py-0.5 rounded-full text-xs transition-colors", activeTab === 'photos' ? "bg-primary-100 text-primary-700" : "bg-gray-200 text-gray-600")}>{photos.length}</span>
        </button>
        {userAttendance?.status === 'YES' && (
          <button
            onClick={() => setActiveTab('feedback')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all whitespace-nowrap outline-none focus:bg-gray-50",
              activeTab === 'feedback' ? "border-primary-600 text-primary-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/70"
            )}
          >
            <Star className="w-4 h-4" /> Feedback
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-5 sm:p-6 flex-1 min-h-0 overflow-hidden bg-white">
        
        {/* DETAILS TAB */}
        {activeTab === 'details' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-full">
              <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5">
                <p className="text-[11px] tracking-wide uppercase font-semibold text-gray-500 mb-2">Event details</p>
                <p className="text-sm sm:text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {visibleDetailsText}
                </p>
                {shouldTruncateDetails && (
                  <button
                    type="button"
                    onClick={() => setDetailsExpanded((prev) => !prev)}
                    className="mt-3 text-sm font-semibold text-primary-700 hover:text-primary-800"
                  >
                    {detailsExpanded ? 'Read less' : 'Read more'}
                  </button>
                )}
              </div>
            </div>
        )}

        {/* DISCUSSION TAB */}
        {activeTab === 'discussion' && (
          <DiscussionTab
            comments={comments}
            eventId={eventId}
            currentUserId={currentUserId}
            canManage={canManage}
          />
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
          <div className="h-full min-h-0 flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900">Shared Photos</h3>
                <span className="text-xs text-gray-500">Single photo upload</span>
              </div>

              <form onSubmit={handlePhotoUpload} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    key={fileInputKey}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setSelectedPhotoFile(file)
                      setPhotoError(null)
                    }}
                    className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200"
                  />
                  <button
                    type="submit"
                    disabled={isPhotoPending || !selectedPhotoFile}
                    className={cn(STYLES.btn, STYLES.btnPrimary, "px-4 py-2 text-sm whitespace-nowrap")}
                  >
                    {isPhotoPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload
                  </button>
                </div>

                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Add an optional caption"
                  className={cn(STYLES.input, "w-full text-sm")}
                  maxLength={180}
                />

                {selectedPhotoFile && (
                  <p className="text-xs text-gray-500">
                    Ready: <span className="font-medium text-gray-700">{selectedPhotoFile.name}</span>
                  </p>
                )}
                {photoError && <p className="text-xs text-red-600">{photoError}</p>}
              </form>
            </div>

            {photos.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex-1 min-h-0 flex items-center justify-center flex-col">
                    <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No photos yet. Be the first to share!</p>
                </div>
            ) : (
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map(photo => (
                        <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                            <Image src={photo.url} alt={photo.caption || "Event photo"} width={400} height={400} className="w-full h-full object-cover" unoptimized />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                <span className="text-white text-xs truncate font-medium">{photo.uploader.name}</span>
                                {photo.caption && <span className="text-white/80 text-[10px] truncate">{photo.caption}</span>}
                            </div>
                            {(canManage || photo.uploaderId === currentUserId) && (
                                <button 
                                    onClick={async () => {
                                        if(!confirm('Delete this photo?')) return;
                                        await deleteEventPhoto(photo.id)
                                        router.refresh()
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                  </div>
                </div>
            )}
          </div>
        )}

        {/* FEEDBACK TAB */}
        {activeTab === 'feedback' && (
          <div className="max-w-md mx-auto py-4 animate-in fade-in duration-300">
            {userAttendance?.feedbackRating ? (
                 <div className="text-center bg-green-50 p-6 rounded-lg border border-green-100">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
                        <Star className="w-6 h-6 fill-current" />
                    </div>
                    <h3 className="font-bold text-green-800 mb-1">Feedback Submitted</h3>
                    <p className="text-green-700 text-sm">Thank you for sharing your thoughts!</p>
                 </div>
            ) : (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">How was the event?</h3>
                    <form action={async (formData) => { await submitFeedback(formData) }} className="space-y-4">
                        <input type="hidden" name="eventId" value={eventId} />
                        
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map(num => (
                                <label key={num} className="cursor-pointer group">
                                    <input type="radio" name="rating" value={num} required className="sr-only peer" />
                                    <Star className="w-8 h-8 text-gray-300 peer-checked:text-yellow-400 peer-checked:fill-current group-hover:text-yellow-200 transition-colors" />
                                </label>
                            ))}
                        </div>
                        
                        <textarea name="comment" placeholder="Share your thoughts (private to admins)..." className={cn(STYLES.input, "w-full")} rows={3} />
                        
                        <label className="flex items-center gap-2 text-sm text-gray-600 justify-center">
                            <input type="checkbox" name="isAnonymous" /> Submit anonymously
                        </label>
                        
                        <button type="submit" className={cn(STYLES.btn, STYLES.btnPrimary, "w-full")}>Submit Feedback</button>
                    </form>
                </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
