'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabaseClient } from '@/lib/supabase-client'
import type { UserProfile } from '@/lib/supabase'

// Light mode color palette (matches admin panel)
const colors = {
  bg: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  textMuted: '#64748b',
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
}

type Submission = {
  id: string
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
  customer_company_name: string
  customer_first_name: string
  customer_last_name: string
  customer_email: string
  agent_count: string | null
  solutions_interested: string[] | null
  rejection_reason: string | null
  reviewed_at: string | null
}

const TSD_OPTIONS = [
  'Avant', 'Telarus', 'Intelisys', 'Sandler Partners', 'AppSmart', 'TBI', 'Bridgepointe', 'Other',
]

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  backgroundColor: colors.white,
  color: colors.text,
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: 6,
  textTransform: 'uppercase' as const,
}

export default function PartnerDashboard() {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    company_name: '',
    phone: '',
    tsd_name: '',
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaveMessage, setProfileSaveMessage] = useState('')

  const fetchSubmissions = useCallback(async (partnerId: string | null) => {
    if (!supabase || !partnerId) {
      setSubmissions([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('deal_registrations')
        .select('id, created_at, status, customer_company_name, customer_first_name, customer_last_name, customer_email, agent_count, solutions_interested, rejection_reason, reviewed_at')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching submissions:', error)
        return
      }

      setSubmissions(data || [])
    } catch (err) {
      console.error('Error fetching submissions:', err)
    }
  }, [supabase])

  useEffect(() => {
    if (!supabase) return

    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/partner/dashboard')
        return
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // If no profile exists, try to create one from auth metadata
      if (profileError && profileError.code === 'PGRST116') {
        console.log('No profile found, attempting to create one...')
        const metadata = user.user_metadata || {}
        const newProfile = {
          id: user.id,
          role: 'partner' as const,
          full_name: metadata.full_name || user.email?.split('@')[0] || 'Unknown',
          email: user.email || '',
          company_name: metadata.company_name || null,
          phone: null,
          tsd_name: null,
          legacy_partner_id: null,
          is_active: true,
          created_at: new Date().toISOString(),
        }

        const { error: createError } = await supabase
          .from('user_profiles')
          .insert(newProfile)

        if (createError) {
          console.error('Failed to create profile:', createError)
          await supabase.auth.signOut()
          router.push('/login?error=profile_missing')
          return
        }

        setProfile(newProfile as UserProfile)
        setEditFormData({
          full_name: newProfile.full_name,
          company_name: newProfile.company_name || '',
          phone: '',
          tsd_name: '',
        })
        fetchSubmissions(newProfile.id) // Use profile ID for submissions
        setIsLoading(false)
        return
      }

      if (profileError || !profileData) {
        console.error('Error fetching profile:', profileError)
        router.push('/login')
        return
      }

      setProfile(profileData)
      setEditFormData({
        full_name: profileData.full_name || '',
        company_name: profileData.company_name || '',
        phone: profileData.phone || '',
        tsd_name: profileData.tsd_name || '',
      })
      // Use profile ID for submissions (or legacy_partner_id if exists)
      fetchSubmissions(profileData.legacy_partner_id || profileData.id)
      setIsLoading(false)
    }

    checkAuth()
  }, [router, supabase, fetchSubmissions])

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSaveProfile = async () => {
    if (!supabase || !profile) return
    setIsSavingProfile(true)
    setProfileSaveMessage('')

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: editFormData.full_name,
          company_name: editFormData.company_name || null,
          phone: editFormData.phone || null,
          tsd_name: editFormData.tsd_name || null,
        })
        .eq('id', profile.id)

      if (error) {
        console.error('Error updating profile:', error)
        setProfileSaveMessage('Failed to save changes')
        return
      }

      // Update local profile state
      setProfile(prev => prev ? {
        ...prev,
        full_name: editFormData.full_name,
        company_name: editFormData.company_name || null,
        phone: editFormData.phone || null,
        tsd_name: editFormData.tsd_name || null,
      } : null)

      setProfileSaveMessage('Profile saved successfully!')
      setTimeout(() => setProfileSaveMessage(''), 3000)
    } catch (err) {
      console.error('Error saving profile:', err)
      setProfileSaveMessage('Failed to save changes')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const filteredSubmissions = submissions.filter(sub => {
    if (activeTab === 'all') return true
    return sub.status === activeTab
  })

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      pending: { bg: colors.warningLight, text: colors.warningText },
      approved: { bg: colors.successLight, text: colors.successText },
      rejected: { bg: colors.errorLight, text: colors.errorText },
    }
    const style = styles[status] || styles.pending
    return (
      <span style={{ padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500, backgroundColor: style.bg, color: style.text, textTransform: 'capitalize' }}>
        {status}
      </span>
    )
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.primary, margin: 0 }}>AmplifAI</h1>
            <span style={{ padding: '4px 10px', backgroundColor: colors.bg, borderRadius: 4, fontSize: 12, color: colors.textMuted }}>Partner Portal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: colors.text, margin: 0 }}>{profile?.full_name}</p>
              <p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>{profile?.company_name}</p>
            </div>
            <button onClick={handleLogout} style={{ padding: '8px 16px', fontSize: 14, backgroundColor: colors.white, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {/* Welcome + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: colors.text, margin: 0 }}>
              Welcome back, {profile?.full_name?.split(' ')[0]}
            </h2>
            <p style={{ fontSize: 14, color: colors.textMuted, margin: '4px 0 0' }}>Manage your deal registrations</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setShowEditProfile(!showEditProfile)}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                backgroundColor: colors.white,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {showEditProfile ? 'Hide Profile' : 'Edit Profile'}
            </button>
            <Link href="/partner/submit" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: colors.primary, color: colors.white, borderRadius: 6, textDecoration: 'none' }}>
              + Submit New Deal
            </Link>
          </div>
        </div>

        {/* Edit Profile Section */}
        {showEditProfile && (
          <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0 }}>
                Your Partner Information
              </h3>
              <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 0' }}>
                This information will be auto-filled when you submit new deals
              </p>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    type="text"
                    value={editFormData.full_name}
                    onChange={e => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Your full name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Company Name</label>
                  <input
                    type="text"
                    value={editFormData.company_name}
                    onChange={e => setEditFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Your company"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={e => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Default TSD</label>
                  <select
                    value={editFormData.tsd_name}
                    onChange={e => setEditFormData(prev => ({ ...prev, tsd_name: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Select your TSD</option>
                    {TSD_OPTIONS.map(tsd => (
                      <option key={tsd} value={tsd}>{tsd}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  style={{
                    padding: '10px 24px',
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: colors.primary,
                    color: colors.white,
                    border: 'none',
                    borderRadius: 6,
                    cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                    opacity: isSavingProfile ? 0.7 : 1,
                  }}
                >
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
                {profileSaveMessage && (
                  <span style={{
                    fontSize: 14,
                    color: profileSaveMessage.includes('success') ? colors.success : colors.error,
                  }}>
                    {profileSaveMessage}
                  </span>
                )}
              </div>
              <p style={{ marginTop: 12, fontSize: 12, color: colors.textMuted }}>
                Email: {profile?.email} (cannot be changed)
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total', value: stats.total, color: colors.primary },
            { label: 'Pending', value: stats.pending, color: colors.warning },
            { label: 'Approved', value: stats.approved, color: colors.success },
            { label: 'Rejected', value: stats.rejected, color: colors.error },
          ].map(stat => (
            <div key={stat.label} style={{ padding: 20, backgroundColor: colors.white, borderRadius: 8, border: `1px solid ${colors.border}` }}>
              <p style={{ fontSize: 13, color: colors.textMuted, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>{stat.label}</p>
              <p style={{ fontSize: 32, fontWeight: 700, color: stat.color, margin: '8px 0 0' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                backgroundColor: activeTab === tab ? colors.primary : colors.white,
                color: activeTab === tab ? colors.white : colors.text,
                border: activeTab === tab ? 'none' : `1px solid ${colors.border}`,
                borderRadius: 6,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab} {tab !== 'all' && `(${stats[tab]})`}
            </button>
          ))}
        </div>

        {/* Submissions Table */}
        <div style={{ backgroundColor: colors.white, borderRadius: 8, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          {filteredSubmissions.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: colors.textMuted, margin: 0 }}>
                {activeTab === 'all' ? 'No submissions yet.' : `No ${activeTab} submissions.`}
              </p>
              {activeTab === 'all' && (
                <Link href="/partner/submit" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', backgroundColor: colors.primary, color: colors.white, borderRadius: 6, textDecoration: 'none', fontWeight: 500 }}>
                  Submit Your First Deal
                </Link>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ textAlign: 'left', padding: 16, fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
                  <th style={{ textAlign: 'left', padding: 16, fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact</th>
                  <th style={{ textAlign: 'left', padding: 16, fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agents</th>
                  <th style={{ textAlign: 'left', padding: 16, fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted</th>
                  <th style={{ textAlign: 'left', padding: 16, fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(sub => (
                  <tr key={sub.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: 16 }}>
                      <p style={{ fontWeight: 500, color: colors.text, margin: 0, fontSize: 14 }}>{sub.customer_company_name}</p>
                      <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 0' }}>
                        {sub.customer_first_name} {sub.customer_last_name}
                      </p>
                    </td>
                    <td style={{ padding: 16 }}>
                      <p style={{ fontSize: 14, color: colors.text, margin: 0 }}>{sub.customer_email}</p>
                    </td>
                    <td style={{ padding: 16 }}>
                      <p style={{ fontSize: 14, color: colors.text, margin: 0 }}>{sub.agent_count || '-'}</p>
                    </td>
                    <td style={{ padding: 16 }}>
                      <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>
                        {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td style={{ padding: 16 }}>
                      {getStatusBadge(sub.status)}
                      {sub.status === 'rejected' && sub.rejection_reason && (
                        <p style={{ fontSize: 12, marginTop: 4, color: colors.errorText }}>{sub.rejection_reason}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
          Need help? Contact{' '}
          <a href="mailto:greynolds@amplifai.com" style={{ color: colors.primary, textDecoration: 'none' }}>
            greynolds@amplifai.com
          </a>
        </p>
      </footer>
    </div>
  )
}
