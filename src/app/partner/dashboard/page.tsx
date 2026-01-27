'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient, type UserProfile } from '@/lib/supabase'

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
      pending: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308' },
      approved: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
      rejected: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
    }
    const style = styles[status] || styles.pending
    return (
      <span
        className="px-2 py-1 rounded-full text-xs font-medium capitalize"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {status}
      </span>
    )
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
              Partner Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{profile?.full_name}</p>
              <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>{profile?.company_name}</p>
            </div>
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
        {/* Welcome + CTA */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
              Welcome back, {profile?.full_name?.split(' ')[0]}
            </h2>
            <p className="mt-1" style={{ color: 'var(--foreground-muted)' }}>
              Manage your deal registrations
            </p>
          </div>
          <Link
            href="/partner/submit"
            className="px-4 py-2 rounded-lg font-medium transition-all"
            style={{ backgroundColor: 'var(--primary-600)', color: 'white' }}
          >
            + Submit New Deal
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'var(--primary-600)' },
            { label: 'Pending', value: stats.pending, color: '#eab308' },
            { label: 'Approved', value: stats.approved, color: '#22c55e' },
            { label: 'Rejected', value: stats.rejected, color: '#ef4444' },
          ].map(stat => (
            <div
              key={stat.label}
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{stat.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize"
              style={{
                backgroundColor: activeTab === tab ? 'var(--primary-600)' : 'var(--card-bg)',
                color: activeTab === tab ? 'white' : 'var(--foreground-muted)',
                border: activeTab === tab ? 'none' : '1px solid var(--card-border)',
              }}
            >
              {tab} {tab !== 'all' && `(${stats[tab]})`}
            </button>
          ))}
        </div>

        {/* Submissions Table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center">
              <p style={{ color: 'var(--foreground-muted)' }}>
                {activeTab === 'all' ? 'No submissions yet.' : `No ${activeTab} submissions.`}
              </p>
              {activeTab === 'all' && (
                <Link
                  href="/partner/submit"
                  className="inline-block mt-4 px-4 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: 'var(--primary-600)', color: 'white' }}
                >
                  Submit Your First Deal
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Customer</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Contact</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Agents</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Submitted</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(sub => (
                  <tr
                    key={sub.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--card-border)' }}
                  >
                    <td className="p-4">
                      <p className="font-medium" style={{ color: 'var(--foreground)' }}>{sub.customer_company_name}</p>
                      <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                        {sub.customer_first_name} {sub.customer_last_name}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm" style={{ color: 'var(--foreground)' }}>{sub.customer_email}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm" style={{ color: 'var(--foreground)' }}>{sub.agent_count || '-'}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                        {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(sub.status)}
                      {sub.status === 'rejected' && sub.rejection_reason && (
                        <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                          {sub.rejection_reason}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8">
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Need help? Contact{' '}
          <a href="mailto:greynolds@amplifai.com" className="hover:underline" style={{ color: 'var(--primary-600)' }}>
            greynolds@amplifai.com
          </a>
        </p>
      </footer>
    </div>
  )
}
