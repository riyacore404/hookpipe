'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

type Member = {
  id: string
  userId: string
  role: string
  createdAt: string
}

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  member: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function TeamMembers() {
  const { getToken, orgId } = useAuth()
  const queryClient = useQueryClient()
  const [newUserId, setNewUserId] = useState('')
  const [newRole, setNewRole] = useState<'member' | 'admin'>('member')
  const [showForm, setShowForm] = useState(false)

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', orgId],
    queryFn: async () => {
      if (!orgId) return []
      const token = await getToken()
      const res = await api.get(`/api/organisations/${orgId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.data as Member[]
    },
    enabled: !!orgId,
  })

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return api.post(
        `/api/organisations/${orgId}/members`,
        { userId: newUserId, role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', orgId] })
      setNewUserId('')
      setNewRole('member')
      setShowForm(false)
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const token = await getToken()
      return api.delete(`/api/organisations/${orgId}/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', orgId] })
    },
  })

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading members...</div>
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-800">Team members</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          + Invite member
        </button>
      </div>

      {/* invite form */}
      {showForm && (
        <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl">
          <p className="text-xs font-medium text-gray-700 mb-3">Invite by user ID</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Clerk user ID (user_...)"
              value={newUserId}
              onChange={e => setNewUserId(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 font-mono"
            />
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as 'member' | 'admin')}
              className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white outline-none"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={() => inviteMutation.mutate()}
              disabled={!newUserId || inviteMutation.isPending}
              className="text-xs px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {inviteMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Find user IDs in your Clerk dashboard → Users
          </p>
        </div>
      )}

      {/* members list */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {!members || members.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No members yet
          </div>
        ) : (
          members.map((member, i) => (
            <div
              key={member.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i < members.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              {/* avatar placeholder */}
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 flex-shrink-0">
                {member.userId.slice(5, 7).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-gray-600 truncate">
                  {member.userId}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Joined {new Date(member.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>

              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_STYLES[member.role] ?? ROLE_STYLES.member}`}>
                {member.role}
              </span>

              <button
                onClick={() => removeMutation.mutate(member.id)}
                className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}