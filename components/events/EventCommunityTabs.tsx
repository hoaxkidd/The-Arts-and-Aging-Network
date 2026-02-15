'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
  Loader2
} from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { postComment, submitFeedback, uploadPhoto, deleteComment, deletePhoto } from '@/app/actions/engagement'
import {
  addComment,
  editComment,
  deleteComment as deleteCommentNew,
  toggleReaction
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
  const [editedContent, setEditedContent] = useState(comment.content)
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
              {createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at{' '}
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
                    setEditedContent(comment.content)
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{comment.content}</p>
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
  const [newComment, setNewComment] = useState('')
  const [replyContent, setReplyContent] = useState('')

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    startTransition(async () => {
      await addComment(eventId, newComment)
      setNewComment('')
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

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Comment Form */}
      <form onSubmit={handleSubmitComment} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className={cn(STYLES.input, "flex-1")}
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending || !newComment.trim()}
          className={cn(STYLES.btn, STYLES.btnPrimary, "px-3")}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {/* Comments List */}
      <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2">
        {topLevelComments.length === 0 ? (
          <div className="text-center py-10 text-gray-500 italic">
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
  const [activeTab, setActiveTab] = useState<'details' | 'discussion' | 'photos' | 'feedback'>('details')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Optimistic UI could be added here, but for now we rely on Server Actions + revalidatePath
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-100 overflow-x-auto bg-gray-50/50">
        <button
          onClick={() => setActiveTab('details')}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all whitespace-nowrap outline-none focus:bg-gray-50",
            activeTab === 'details' ? "border-primary-600 text-primary-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          )}
        >
          <User className="w-4 h-4" /> Details
        </button>
        <button
          onClick={() => setActiveTab('discussion')}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all whitespace-nowrap outline-none focus:bg-gray-50",
            activeTab === 'discussion' ? "border-primary-600 text-primary-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          )}
        >
          <MessageSquare className="w-4 h-4" /> Discussion
          <span className={cn("px-1.5 py-0.5 rounded-full text-xs transition-colors", activeTab === 'discussion' ? "bg-primary-100 text-primary-700" : "bg-gray-200 text-gray-600")}>{comments.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all whitespace-nowrap outline-none focus:bg-gray-50",
            activeTab === 'photos' ? "border-primary-600 text-primary-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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
              activeTab === 'feedback' ? "border-primary-600 text-primary-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            )}
          >
            <Star className="w-4 h-4" /> Feedback
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-6 min-h-[400px]">
        
        {/* DETAILS TAB */}
        {activeTab === 'details' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {description || "No description provided for this event."}
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
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Shared Photos</h3>
                <form action={async (formData) => {
                    await uploadPhoto(formData)
                }}>
                    <input type="hidden" name="eventId" value={eventId} />
                    <label className="cursor-pointer bg-primary-50 text-primary-700 hover:bg-primary-100 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors">
                        <Upload className="w-4 h-4" /> Upload
                        <input type="file" name="photo" accept="image/*" className="hidden" onChange={(e) => e.target.form?.requestSubmit()} />
                    </label>
                </form>
            </div>

            {photos.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No photos yet. Be the first to share!</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map(photo => (
                        <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                            <img src={photo.url} alt={photo.caption || "Event photo"} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                <span className="text-white text-xs truncate font-medium">{photo.uploader.name}</span>
                                {photo.caption && <span className="text-white/80 text-[10px] truncate">{photo.caption}</span>}
                            </div>
                            {(canManage || photo.uploaderId === currentUserId) && (
                                <button 
                                    onClick={async () => {
                                        if(!confirm('Delete this photo?')) return;
                                        await deletePhoto(photo.id, eventId)
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
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
