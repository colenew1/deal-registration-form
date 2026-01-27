'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient, type UserProfile } from '@/lib/supabase'

// Light mode color palette (matches admin panel)
const colors = {
  bg: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  primary: '#2563eb',
  primaryLight: '#dbeafe',
  primaryText: '#1e40af',
  success: '#16a34a',
  successLight: '#dcfce7',
  successText: '#166534',
  warning: '#d97706',
  warningLight: '#fef3c7',
  warningText: '#92400e',
  error: '#dc2626',
  errorLight: '#fee2e2',
  errorText: '#991b1b',
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
}

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${colors.primary}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      {/* Header */}
      <header style={{ backgroundColor: colors.white, borderBottom: `1px solid ${colors.border}`, padding: '16px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: colors.text, margin: 0 }}>User Management</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14, color: colors.textMuted }}>{profile?.full_name}</span>
            <Link href="/admin" style={{ padding: '8px 16px', fontSize: 14, backgroundColor: colors.white, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, textDecoration: 'none' }}>
              Back to Dashboard
            </Link>
            <button onClick={handleLogout} style={{ padding: '8px 16px', fontSize: 14, backgroundColor: colors.white, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>Manage admin and partner accounts</p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: colors.primary, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            + Create User
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 20, backgroundColor: colors.white, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: 13, color: colors.textMuted, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Total Users</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: colors.primary, margin: '8px 0 0' }}>{users.length}</p>
          </div>
          <div style={{ padding: 20, backgroundColor: colors.white, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: 13, color: colors.textMuted, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Admins</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: colors.purple, margin: '8px 0 0' }}>{users.filter(u => u.role === 'admin').length}</p>
          </div>
          <div style={{ padding: 20, backgroundColor: colors.white, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: 13, color: colors.textMuted, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Partners</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: colors.success, margin: '8px 0 0' }}>{users.filter(u => u.role === 'partner').length}</p>
          </div>
        </div>

        {/* Users Table */}
        <div style={{ backgroundColor: colors.white, borderRadius: 8, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ textAlign: 'left', padding: 16, fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>User</th>
                <th style={{ textAlign: 'left', padding: 16, fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                <th style={{ textAlign: 'left', padding: 16, fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
                <th style={{ textAlign: 'left', padding: 16, fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: 16, fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created</th>
                <th style={{ textAlign: 'left', padding: 16, fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: 16 }}>
                    <p style={{ fontWeight: 500, color: colors.text, margin: 0, fontSize: 14 }}>{user.full_name}</p>
                    {user.company_name && (
                      <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 0' }}>{user.company_name}</p>
                    )}
                  </td>
                  <td style={{ padding: 16 }}>
                    <p style={{ fontSize: 14, color: colors.text, margin: 0 }}>{user.email}</p>
                  </td>
                  <td style={{ padding: 16 }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: user.role === 'admin' ? colors.purpleLight : colors.successLight,
                      color: user.role === 'admin' ? colors.purple : colors.successText,
                      textTransform: 'capitalize',
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: 16 }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: user.is_active ? colors.successLight : colors.errorLight,
                      color: user.is_active ? colors.successText : colors.errorText,
                    }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: 16 }}>
                    <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td style={{ padding: 16 }}>
                    {user.id !== profile?.id && (
                      <button
                        onClick={() => handleToggleStatus(user.id, user.is_active)}
                        style={{
                          padding: '6px 12px',
                          fontSize: 13,
                          fontWeight: 500,
                          backgroundColor: user.is_active ? colors.errorLight : colors.successLight,
                          color: user.is_active ? colors.errorText : colors.successText,
                          border: `1px solid ${user.is_active ? colors.error : colors.success}`,
                          borderRadius: 6,
                          cursor: 'pointer',
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
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div
          style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 50 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false) }}
        >
          <div style={{ width: '100%', maxWidth: 420, backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>Create New User</h3>
            </div>

            <div style={{ padding: 24 }}>
              {createError && (
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: colors.errorLight, border: `1px solid ${colors.error}`, borderRadius: 6 }}>
                  <p style={{ margin: 0, fontSize: 14, color: colors.errorText }}>{createError}</p>
                </div>
              )}

              <form onSubmit={handleCreateUser}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                    Full Name <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                    required
                    placeholder="John Smith"
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                    Email <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    required
                    placeholder="user@example.com"
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                    Password <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white }}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                    Role <span style={{ color: colors.error }}>*</span>
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'admin' | 'partner' }))}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white }}
                  >
                    <option value="partner">Partner</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{ flex: 1, padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: colors.white, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    style={{ flex: 1, padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: colors.primary, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer', opacity: isCreating ? 0.7 : 1 }}
                  >
                    {isCreating ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
