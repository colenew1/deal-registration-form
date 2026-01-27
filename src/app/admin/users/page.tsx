'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient, type UserProfile } from '@/lib/supabase'

export default function AdminUsersPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClientComponentClient(), [])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'partner' as 'admin' | 'partner',
  })

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/admin/users')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profileData || profileData.role !== 'admin') {
        router.push('/partner/dashboard')
        return
      }

      setProfile(profileData)
      fetchUsers()
    }

    checkAuth()
  }, [router, supabase])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
    } else {
      setUsers(data || [])
    }
    setIsLoading(false)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setIsCreating(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      const data = await response.json()

      if (!response.ok) {
        setCreateError(data.error || 'Failed to create user')
        return
      }

      setShowCreateModal(false)
      setNewUser({ email: '', password: '', full_name: '', role: 'partner' })
      fetchUsers()
    } catch (err) {
      console.error('Create user error:', err)
      setCreateError('An error occurred. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !isActive })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user status:', error)
    } else {
      fetchUsers()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--primary-600)' }}></div>
          <p className="mt-4" style={{ color: 'var(--foreground-muted)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold" style={{ color: 'var(--primary-600)' }}>
              AmplifAI
            </h1>
            <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground-muted)' }}>
              Admin Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{profile?.full_name}</p>
              <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Administrator</p>
            </div>
            <Link
              href="/admin"
              className="text-sm px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--foreground-muted)', border: '1px solid var(--card-border)' }}
            >
              Back to Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--foreground-muted)', border: '1px solid var(--card-border)' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
              User Management
            </h2>
            <p className="mt-1" style={{ color: 'var(--foreground-muted)' }}>
              Manage admin and partner accounts
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg font-medium transition-all"
            style={{ backgroundColor: 'var(--primary-600)', color: 'white' }}
          >
            + Create User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Total Users</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--primary-600)' }}>{users.length}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Admins</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#8b5cf6' }}>{users.filter(u => u.role === 'admin').length}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Partners</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#22c55e' }}>{users.filter(u => u.role === 'partner').length}</p>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>User</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Email</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Role</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Status</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Created</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td className="p-4">
                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>{user.full_name}</p>
                    {user.company_name && (
                      <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{user.company_name}</p>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="text-sm" style={{ color: 'var(--foreground)' }}>{user.email}</p>
                  </td>
                  <td className="p-4">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium capitalize"
                      style={{
                        backgroundColor: user.role === 'admin' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        color: user.role === 'admin' ? '#8b5cf6' : '#22c55e',
                      }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: user.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: user.is_active ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="p-4">
                    {user.id !== profile?.id && (
                      <button
                        onClick={() => handleToggleStatus(user.id, user.is_active)}
                        className="text-sm px-3 py-1 rounded-lg transition-colors"
                        style={{
                          color: user.is_active ? '#ef4444' : '#22c55e',
                          border: `1px solid ${user.is_active ? '#ef4444' : '#22c55e'}`,
                        }}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create User Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false)
          }}
        >
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Create New User
            </h3>

            {createError && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                  required
                  className="form-input"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="form-input"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={8}
                  className="form-input"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'admin' | 'partner' }))}
                  className="form-select"
                >
                  <option value="partner">Partner</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors"
                  style={{ color: 'var(--foreground-muted)', border: '1px solid var(--card-border)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-2 px-4 rounded-lg font-medium transition-all disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary-600)', color: 'white' }}
                >
                  {isCreating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
