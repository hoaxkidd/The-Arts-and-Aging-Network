'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Reply,
  Edit2,
  Trash2,
  Send,
  MoreVertical,
  X,
  Loader2,
  Image as ImageIcon,
  Camera
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLES } from '@/lib/styles'
import {
  addComment,
  editComment,
  deleteComment,
  toggleReaction,
  addEventPhoto,
  deleteEventPhoto
} from '@/app/actions/event-engagement'

type User = {
  id: string
  name: string | null
  image: string | null
  role?: string
}

type Reaction = {
  id: string
  type: 'LIKE' | 'HEART' | 'DOWNVOTE'
  userId: string
  user: { id: string; name: string | null }
}

type Comment = {
  id: string
  content: string
  createdAt: string | Date
  updatedAt: string | Date
  user: User
  reactions: Reaction[]
  replies?: Comment[]
  parentId?: string | null
}

type Photo = {
  id: string
  url: string
  caption: string | null
  createdAt: string | Date
  uploader: User
  reactions: Reaction[]
}

interface EventEngagementProps {
  eventId: string
  currentUserId: string
  currentUserRole: string
  comments: Comment[]
  photos: Photo[]
}

// Reaction Button Component
function ReactionButtons({
  reactions,
  currentUserId,
  onReact,
  isPending,
  size = 'sm'
}: {
  reactions: Reaction[]
  currentUserId: string
  onReact: (type: 'LIKE' | 'HEART' | 'DOWNVOTE') => void
  isPending: boolean
  size?: 'sm' | 'md'
}) {
  const likeCount = reactions.filter(r => r.type === 'LIKE').length
  const heartCount = reactions.filter(r => r.type === 'HEART').length
  const downvoteCount = reactions.filter(r => r.type === 'DOWNVOTE').length

  const userReaction = reactions.find(r => r.userId === currentUserId)?.type

  const buttonClass = size === 'sm'
    ? 'p-1 text-xs gap-1'
    : 'p-1.5 text-sm gap-1.5'

  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onReact('LIKE')}
        disabled={isPending}
        className={cn(
          "flex items-center rounded-full transition-colors",
          buttonClass,
          userReaction === 'LIKE'
            ? "bg-blue-100 text-blue-600"
            : "text-gray-500 hover:bg-gray-100"
        )}
      >
        <ThumbsUp className={iconClass} />
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>

      <button
        onClick={() => onReact('HEART')}
        disabled={isPending}
        className={cn(
          "flex items-center rounded-full transition-colors",
          buttonClass,
          userReaction === 'HEART'
            ? "bg-red-100 text-red-500"
            : "text-gray-500 hover:bg-gray-100"
        )}
      >
        <Heart className={cn(iconClass, userReaction === 'HEART' && "fill-current")} />
        {heartCount > 0 && <span>{heartCount}</span>}
      </button>

      <button
        onClick={() => onReact('DOWNVOTE')}
        disabled={isPending}
        className={cn(
          "flex items-center rounded-full transition-colors",
          buttonClass,
          userReaction === 'DOWNVOTE'
            ? "bg-gray-200 text-gray-700"
            : "text-gray-500 hover:bg-gray-100"
        )}
      >
        <ThumbsDown className={iconClass} />
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
  currentUserRole,
  onReply,
  depth = 0
}: {
  comment: Comment
  eventId: string
  currentUserId: string
  currentUserRole: string
  onReply?: (commentId: string) => void
  depth?: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(comment.content)
  const [showMenu, setShowMenu] = useState(false)

  const isOwner = comment.user.id === currentUserId
  const isAdmin = currentUserRole === 'ADMIN'
  const canEdit = isOwner
  const canDelete = isOwner || isAdmin

  const createdAt = new Date(comment.createdAt)
  const updatedAt = new Date(comment.updatedAt)
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
    if (!confirm('Are you sure you want to delete this comment?')) return

    startTransition(async () => {
      await deleteComment(comment.id)
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
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
          {comment.user.image ? (
            <img src={comment.user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            comment.user.name?.charAt(0) || '?'
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm">{comment.user.name}</span>
            {comment.user.role && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                {comment.user.role}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at{' '}
              {createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
            {wasEdited && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className={cn(STYLES.input, "h-20 resize-none text-sm")}
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
            <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-2">
              <ReactionButtons
                reactions={comment.reactions}
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

              {/* More menu */}
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
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setIsEditing(true)
                              setShowMenu(false)
                            }}
                            className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
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
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
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

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              eventId={eventId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Comment Form Component
function CommentForm({
  eventId,
  parentId,
  onSubmit,
  onCancel,
  placeholder = 'Write a comment...'
}: {
  eventId: string
  parentId?: string
  onSubmit: () => void
  onCancel?: () => void
  placeholder?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [content, setContent] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    startTransition(async () => {
      const result = await addComment(eventId, content, parentId)
      if (!result.error) {
        setContent('')
        onSubmit()
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className={cn(STYLES.input, "h-16 resize-none text-sm")}
          disabled={isPending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  )
}

// Photo Gallery Component
function PhotoGallery({
  photos,
  eventId,
  currentUserId,
  currentUserRole
}: {
  photos: Photo[]
  eventId: string
  currentUserId: string
  currentUserRole: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadUrl, setUploadUrl] = useState('')
  const [uploadCaption, setUploadCaption] = useState('')

  const handleUpload = () => {
    if (!uploadUrl.trim()) return

    startTransition(async () => {
      const result = await addEventPhoto(eventId, uploadUrl, uploadCaption)
      if (!result.error) {
        setUploadUrl('')
        setUploadCaption('')
        setShowUpload(false)
        router.refresh()
      }
    })
  }

  const handleDelete = (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    startTransition(async () => {
      await deleteEventPhoto(photoId)
      setSelectedPhoto(null)
      router.refresh()
    })
  }

  const handleReaction = (photoId: string, type: 'LIKE' | 'HEART' | 'DOWNVOTE') => {
    startTransition(async () => {
      await toggleReaction(type, undefined, photoId)
      router.refresh()
    })
  }

  return (
    <div>
      {/* Upload Section */}
      <div className="mb-4">
        {showUpload ? (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <input
              type="url"
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              placeholder="Enter image URL..."
              className={cn(STYLES.input, "text-sm")}
            />
            <input
              type="text"
              value={uploadCaption}
              onChange={(e) => setUploadCaption(e.target.value)}
              placeholder="Caption (optional)"
              className={cn(STYLES.input, "text-sm")}
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={isPending || !uploadUrl.trim()}
                className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isPending ? 'Uploading...' : 'Add Photo'}
              </button>
              <button
                onClick={() => {
                  setShowUpload(false)
                  setUploadUrl('')
                  setUploadCaption('')
                }}
                className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
          >
            <Camera className="w-4 h-4" />
            Add Photo
          </button>
        )}
      </div>

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map(photo => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-300 transition-all"
            >
              <img
                src={photo.url}
                alt={photo.caption || 'Event photo'}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No photos yet. Be the first to share!</p>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setSelectedPhoto(null)} />
          <div className="relative max-w-4xl w-full bg-white rounded-lg overflow-hidden">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || ''}
              className="w-full max-h-[70vh] object-contain bg-black"
            />

            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Uploaded by <span className="font-medium">{selectedPhoto.uploader.name}</span>
                  </p>
                  {selectedPhoto.caption && (
                    <p className="text-gray-700 mt-1">{selectedPhoto.caption}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(selectedPhoto.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <ReactionButtons
                    reactions={selectedPhoto.reactions}
                    currentUserId={currentUserId}
                    onReact={(type) => handleReaction(selectedPhoto.id, type)}
                    isPending={isPending}
                    size="md"
                  />

                  {(selectedPhoto.uploader.id === currentUserId || currentUserRole === 'ADMIN') && (
                    <button
                      onClick={() => handleDelete(selectedPhoto.id)}
                      disabled={isPending}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Main EventEngagement Component
export function EventEngagement({
  eventId,
  currentUserId,
  currentUserRole,
  comments,
  photos
}: EventEngagementProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'comments' | 'photos'>('comments')

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('comments')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'comments'
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({comments.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'photos'
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Photos ({photos.length})
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'comments' ? (
          <div className="space-y-6">
            {/* New Comment Form */}
            <CommentForm
              eventId={eventId}
              onSubmit={() => {}}
              placeholder="Share your thoughts about this event..."
            />

            {/* Comments List */}
            {comments.length > 0 ? (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                {comments.map(comment => (
                  <div key={comment.id}>
                    <CommentItem
                      comment={comment}
                      eventId={eventId}
                      currentUserId={currentUserId}
                      currentUserRole={currentUserRole}
                      onReply={(id) => setReplyingTo(id)}
                    />
                    {replyingTo === comment.id && (
                      <div className="ml-11 mt-3">
                        <CommentForm
                          eventId={eventId}
                          parentId={comment.id}
                          onSubmit={() => setReplyingTo(null)}
                          onCancel={() => setReplyingTo(null)}
                          placeholder={`Reply to ${comment.user.name}...`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No comments yet. Start the conversation!</p>
              </div>
            )}
          </div>
        ) : (
          <PhotoGallery
            photos={photos}
            eventId={eventId}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        )}
      </div>
    </div>
  )
}
