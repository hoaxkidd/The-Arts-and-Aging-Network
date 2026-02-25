'use client'

import { useState } from 'react'
import { UserPlus, UserMinus, Shield, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addGroupMember, removeGroupMember, updateMemberRole } from '@/app/actions/messaging'

type Member = {
  id: string
  userId: string
  role: string
  isActive: boolean
  isMuted: boolean
  lastReadAt: Date | null
  joinedAt: Date
  groupId: string
  user: {
    id: string
    name: string | null
    email: string | null
    preferredName: string | null
    image: string | null
    role: string
  }
}

type Staff = {
  id: string
  name: string | null
  preferredName: string | null
  email: string | null
  role: string
  image: string | null
}

type GroupMembersListProps = {
  groupId: string
  members: Member[]
  availableStaff: Staff[]
}

export function GroupMembersList({ groupId, members, availableStaff }: GroupMembersListProps) {
  const [showAddMember, setShowAddMember] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const handleAddMember = async (userId: string) => {
    setLoading(userId)
    await addGroupMember(groupId, userId)
    setLoading(null)
    setShowAddMember(false)
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the group?')) return
    setLoading(userId)
    await removeGroupMember(groupId, userId)
    setLoading(null)
  }

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN'
    setLoading(userId)
    await updateMemberRole(groupId, userId, newRole)
    setLoading(null)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Members ({members.length})</h3>
        <button
          onClick={() => setShowAddMember(!showAddMember)}
          className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <UserPlus className="w-3 h-3" />
          Add Member
        </button>
      </div>

      {/* Add Member Panel */}
      {showAddMember && availableStaff.length > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-900">Add New Member</p>
            <button
              onClick={() => setShowAddMember(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {availableStaff.map(staff => (
              <div
                key={staff.id}
                className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium">
                    {staff.name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {staff.preferredName || staff.name}
                    </p>
                    <p className="text-xs text-gray-500">{staff.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAddMember(staff.id)}
                  disabled={loading === staff.id}
                  className="px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  {loading === staff.id ? 'Adding...' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="divide-y divide-gray-100">
        {members.map(member => (
          <div key={member.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-medium">
                  {member.user.name?.[0] || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {member.user.preferredName || member.user.name}
                    </p>
                    {member.role === 'ADMIN' && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        Group Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{member.user.email || 'No email'}</p>
                  <p className="text-xs text-gray-400">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleRole(member.userId, member.role)}
                  disabled={loading === member.userId}
                  className={cn(
                    "p-2 rounded hover:bg-gray-100 disabled:opacity-50",
                    member.role === 'ADMIN' ? 'text-purple-600' : 'text-gray-400'
                  )}
                  title={member.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                >
                  <Shield className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  disabled={loading === member.userId}
                  className="p-2 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                  title="Remove member"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
