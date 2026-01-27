'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

export default function PartnerDashboard() {
  const router = useRouter()
  const supabase = useMemo(() => createClientComponentClient(), [])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  const fetchSubmissions = useCallback(async (legacyPartnerId: string | null) => {
    if (!legacyPartnerId) {
      setSubmissions([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('deal_registrations')
        .select('id, created_at, status, customer_company_name, customer_first_name, customer_last_name, customer_email, agent_count, solutions_interested, rejection_reason, reviewed_at')
        .eq('partner_id', legacyPartnerId)
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

      if (profileError || !profileData) {
        console.error('Error fetching profile:', profileError)
        router.push('/login')
        return
      }

      setProfile(profileData)
      fetchSubmissions(profileData.legacy_partner_id)
      setIsLoading(false)
    }

    checkAuth()
  }, [router, supabase, fetchSubmissions])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
          <Link href="/partner/submit" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: colors.primary, color: colors.white, borderRadius: 6, textDecoration: 'none' }}>
            + Submit New Deal
          </Link>
        </div>

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
