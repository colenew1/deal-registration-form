'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient, DealRegistration, type UserProfile } from '@/lib/supabase'
import Link from 'next/link'

const SOLUTIONS = [
  'Performance Management',
  'Coaching',
  'Conversation Intelligence & Analytics',
  'Data Consolidation for CX',
  'AutoQA / QA',
  'Gamification',
  'Other',
]

const AGENT_COUNTS = [
  '1-19',
  '20-49',
  '50-100',
  '101 to 249',
  '250 to 499',
  '500 to 999',
  '1000 to 2499',
  '2500 to 4999',
  '5000+',
]

const TIMELINES = [
  '0-3 months',
  '4-6 months',
  '6-12 months',
  '12+ months',
]

// Reusable components for the edit form
function EditFormInput({
  label,
  type = 'text',
  value,
  onChange,
  className = '',
}: {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={className}>
      <label className="form-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input"
      />
    </div>
  )
}

function EditFormSelect({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  className?: string
}) {
  return (
    <div className={className}>
      <label className="form-label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input form-select"
      >
        <option value="">Select...</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  )
}

// Stat Card Component
function StatCard({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: 'purple' | 'yellow' | 'green' | 'red'
}) {
  const colorClasses = {
    purple: { border: 'var(--primary-600)', text: 'var(--primary-600)' },
    yellow: { border: 'var(--warning-500)', text: 'var(--warning-600)' },
    green: { border: 'var(--success-500)', text: 'var(--success-600)' },
    red: { border: 'var(--error-500)', text: 'var(--error-600)' },
  }

  return (
    <div
      className="stat-card"
      style={{ borderLeftWidth: '4px', borderLeftColor: colorClasses[color].border }}
    >
      <div className="stat-value" style={{ color: colorClasses[color].text }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = useMemo(() => createClientComponentClient(), [])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [registrations, setRegistrations] = useState<DealRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedReg, setSelectedReg] = useState<DealRegistration | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<DealRegistration>>({})
  const [saving, setSaving] = useState(false)

  // Check authentication and admin role
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/admin')
        return
      }

      // Get user profile and check role
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

      if (profileData.role !== 'admin') {
        // Not an admin - redirect to partner dashboard
        router.push('/partner/dashboard')
        return
      }

      setProfile(profileData)
      setIsAuthChecking(false)
      fetchRegistrations()
    }

    checkAuth()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const fetchRegistrations = async () => {
    try {
      const res = await fetch('/api/registrations')
      const data = await res.json()
      setRegistrations(data)
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    if (selectedReg) {
      setEditData({ ...selectedReg })
      setEditMode(true)
    }
  }

  const handleSave = async () => {
    if (!selectedReg) return
    setSaving(true)

    try {
      const res = await fetch(`/api/registrations/${selectedReg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          ...editData,
        }),
      })

      if (res.ok) {
        await fetchRegistrations()
        setEditMode(false)
        setSelectedReg(null)
      }
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setEditData({})
  }

  const handleFieldChange = (field: string, value: string | string[]) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  const handleSolutionChange = (solution: string) => {
    const current = editData.solutions_interested || []
    const updated = current.includes(solution)
      ? current.filter(s => s !== solution)
      : [...current, solution]
    setEditData(prev => ({ ...prev, solutions_interested: updated }))
  }

  const filteredRegistrations = registrations.filter(r =>
    filter === 'all' ? true : r.status === filter
  )

  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return 'badge badge-pending'
      case 'approved': return 'badge badge-approved'
      case 'rejected': return 'badge badge-rejected'
      default: return 'badge'
    }
  }

  if (isAuthChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background-subtle)' }}>
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-4 spinner" style={{ color: 'var(--primary-600)' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p style={{ color: 'var(--foreground-muted)' }}>{isAuthChecking ? 'Checking authorization...' : 'Loading registrations...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background-subtle)' }}>
      {/* Header */}
      <header className="page-header">
        <div className="container">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="icon-container w-10 h-10 rounded-lg" style={{ backgroundColor: 'var(--primary-600)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold">Deal Registration Admin</h1>
                <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Manage partner registrations</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{profile?.full_name}</p>
                <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Administrator</p>
              </div>
              <Link href="/admin/users" className="btn btn-secondary">
                Manage Users
              </Link>
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
          <StatCard value={stats.total} label="Total Registrations" color="purple" />
          <StatCard value={stats.pending} label="Pending Review" color="yellow" />
          <StatCard value={stats.approved} label="Approved" color="green" />
          <StatCard value={stats.rejected} label="Rejected" color="red" />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {f}
              {f !== 'all' && (
                <span
                  className="ml-2 px-2 py-0.5 text-xs rounded-full"
                  style={{
                    backgroundColor: filter === f ? 'rgba(255,255,255,0.2)' : 'var(--background-subtle)',
                  }}
                >
                  {stats[f]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Registration Table */}
        <div className="table-container card animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Partner (TA)</th>
                <th>TSD</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map(reg => (
                <tr key={reg.id}>
                  <td>
                    <div className="font-medium">{reg.customer_company_name}</div>
                    <div className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      {reg.customer_first_name} {reg.customer_last_name}
                    </div>
                  </td>
                  <td>
                    <div className="font-medium">{reg.ta_company_name}</div>
                    <div className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{reg.ta_full_name}</div>
                  </td>
                  <td>
                    <div>{reg.tsd_name}</div>
                    <div className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{reg.tsd_contact_name || '-'}</div>
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(reg.status)}>
                      {reg.status}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      {formatDate(reg.created_at)}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedReg(reg)}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--foreground-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p style={{ color: 'var(--foreground-muted)' }}>No registrations found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Detail/Edit Modal */}
      {selectedReg && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedReg(null)
            setEditMode(false)
            setEditData({})
          }
        }}>
          <div className="modal-content animate-fade-in">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h2 className="text-xl font-semibold">
                    {editMode ? 'Edit Registration' : 'Registration Details'}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--foreground-muted)' }}>
                    {selectedReg.customer_company_name}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedReg(null); setEditMode(false); setEditData({}); }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: 'var(--foreground-muted)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {editMode ? (
                /* Edit Form */
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                  {/* Customer Info */}
                  <section>
                    <h3 className="section-heading text-base mb-4">
                      <span className="step-indicator" style={{ width: '1.5rem', height: '1.5rem', fontSize: '0.75rem' }}>1</span>
                      Customer Information
                    </h3>
                    <div className="grid-form">
                      <EditFormInput
                        label="First Name"
                        value={editData.customer_first_name || ''}
                        onChange={(v) => handleFieldChange('customer_first_name', v)}
                      />
                      <EditFormInput
                        label="Last Name"
                        value={editData.customer_last_name || ''}
                        onChange={(v) => handleFieldChange('customer_last_name', v)}
                      />
                      <EditFormInput
                        label="Job Title"
                        value={editData.customer_job_title || ''}
                        onChange={(v) => handleFieldChange('customer_job_title', v)}
                      />
                      <EditFormInput
                        label="Company Name"
                        value={editData.customer_company_name || ''}
                        onChange={(v) => handleFieldChange('customer_company_name', v)}
                      />
                      <EditFormInput
                        label="Email"
                        type="email"
                        value={editData.customer_email || ''}
                        onChange={(v) => handleFieldChange('customer_email', v)}
                      />
                      <EditFormInput
                        label="Phone"
                        type="tel"
                        value={editData.customer_phone || ''}
                        onChange={(v) => handleFieldChange('customer_phone', v)}
                      />
                      <EditFormInput
                        label="Street Address"
                        value={editData.customer_street_address || ''}
                        onChange={(v) => handleFieldChange('customer_street_address', v)}
                        className="grid-form-full"
                      />
                      <EditFormInput
                        label="City"
                        value={editData.customer_city || ''}
                        onChange={(v) => handleFieldChange('customer_city', v)}
                      />
                      <EditFormInput
                        label="State"
                        value={editData.customer_state || ''}
                        onChange={(v) => handleFieldChange('customer_state', v)}
                      />
                      <EditFormInput
                        label="Postal Code"
                        value={editData.customer_postal_code || ''}
                        onChange={(v) => handleFieldChange('customer_postal_code', v)}
                      />
                      <EditFormInput
                        label="Country"
                        value={editData.customer_country || ''}
                        onChange={(v) => handleFieldChange('customer_country', v)}
                      />
                    </div>
                  </section>

                  {/* Opportunity Details */}
                  <section>
                    <h3 className="section-heading text-base mb-4">
                      <span className="step-indicator" style={{ width: '1.5rem', height: '1.5rem', fontSize: '0.75rem' }}>2</span>
                      Opportunity Details
                    </h3>
                    <div className="grid-form">
                      <EditFormSelect
                        label="Agent Count"
                        value={editData.agent_count || ''}
                        onChange={(v) => handleFieldChange('agent_count', v)}
                        options={AGENT_COUNTS}
                      />
                      <EditFormSelect
                        label="Timeline"
                        value={editData.implementation_timeline || ''}
                        onChange={(v) => handleFieldChange('implementation_timeline', v)}
                        options={TIMELINES}
                      />
                      <div className="grid-form-full">
                        <label className="form-label">Solutions</label>
                        <div className="option-grid">
                          {SOLUTIONS.map(solution => (
                            <div key={solution} className="option-item">
                              <input
                                type="checkbox"
                                id={`edit-solution-${solution}`}
                                checked={(editData.solutions_interested || []).includes(solution)}
                                onChange={() => handleSolutionChange(solution)}
                                className="form-checkbox"
                              />
                              <label htmlFor={`edit-solution-${solution}`}>{solution}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid-form-full">
                        <label className="form-label">Description</label>
                        <textarea
                          value={editData.opportunity_description || ''}
                          onChange={(e) => handleFieldChange('opportunity_description', e.target.value)}
                          rows={3}
                          className="form-input form-textarea"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Partner Info */}
                  <section>
                    <h3 className="section-heading text-base mb-4">
                      <span className="step-indicator" style={{ width: '1.5rem', height: '1.5rem', fontSize: '0.75rem' }}>3</span>
                      Partner (Trusted Advisor)
                    </h3>
                    <div className="grid-form">
                      <EditFormInput
                        label="TA Full Name"
                        value={editData.ta_full_name || ''}
                        onChange={(v) => handleFieldChange('ta_full_name', v)}
                      />
                      <EditFormInput
                        label="TA Company"
                        value={editData.ta_company_name || ''}
                        onChange={(v) => handleFieldChange('ta_company_name', v)}
                      />
                      <EditFormInput
                        label="TA Email"
                        type="email"
                        value={editData.ta_email || ''}
                        onChange={(v) => handleFieldChange('ta_email', v)}
                      />
                      <EditFormInput
                        label="TA Phone"
                        type="tel"
                        value={editData.ta_phone || ''}
                        onChange={(v) => handleFieldChange('ta_phone', v)}
                      />
                    </div>
                  </section>

                  {/* TSD Info */}
                  <section>
                    <h3 className="section-heading text-base mb-4">
                      <span className="step-indicator" style={{ width: '1.5rem', height: '1.5rem', fontSize: '0.75rem' }}>4</span>
                      TSD Information
                    </h3>
                    <div className="grid-form">
                      <EditFormInput
                        label="TSD Name"
                        value={editData.tsd_name || ''}
                        onChange={(v) => handleFieldChange('tsd_name', v)}
                      />
                      <EditFormInput
                        label="TSD Contact Name"
                        value={editData.tsd_contact_name || ''}
                        onChange={(v) => handleFieldChange('tsd_contact_name', v)}
                      />
                      <EditFormInput
                        label="TSD Contact Email"
                        type="email"
                        value={editData.tsd_contact_email || ''}
                        onChange={(v) => handleFieldChange('tsd_contact_email', v)}
                        className="grid-form-full"
                      />
                    </div>
                  </section>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                  {/* Status Banner */}
                  <div className="flex items-center gap-3">
                    <span className={getStatusBadgeClass(selectedReg.status)}>
                      {selectedReg.status.toUpperCase()}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      Submitted {formatDate(selectedReg.created_at)}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <section>
                    <h3 className="font-semibold mb-3">Customer Information</h3>
                    <div className="rounded-lg p-4 grid grid-cols-2 gap-3 text-sm" style={{ backgroundColor: 'var(--background-subtle)' }}>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Company:</span>{' '}
                        <span className="font-medium">{selectedReg.customer_company_name}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Contact:</span>{' '}
                        <span className="font-medium">{selectedReg.customer_first_name} {selectedReg.customer_last_name}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Email:</span>{' '}
                        <span className="font-medium">{selectedReg.customer_email}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Phone:</span>{' '}
                        <span className="font-medium">{selectedReg.customer_phone || '-'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Title:</span>{' '}
                        <span className="font-medium">{selectedReg.customer_job_title || '-'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Agents:</span>{' '}
                        <span className="font-medium">{selectedReg.agent_count || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span style={{ color: 'var(--foreground-muted)' }}>Address:</span>{' '}
                        <span className="font-medium">
                          {[selectedReg.customer_street_address, selectedReg.customer_city, selectedReg.customer_state, selectedReg.customer_postal_code].filter(Boolean).join(', ') || '-'}
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* Opportunity */}
                  <section>
                    <h3 className="font-semibold mb-3">Opportunity Details</h3>
                    <div className="rounded-lg p-4 text-sm space-y-2" style={{ backgroundColor: 'var(--background-subtle)' }}>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Timeline:</span>{' '}
                        <span className="font-medium">{selectedReg.implementation_timeline || '-'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Solutions:</span>{' '}
                        <span className="font-medium">{selectedReg.solutions_interested?.join(', ') || '-'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Description:</span>
                        <p className="mt-1 font-medium">{selectedReg.opportunity_description || '-'}</p>
                      </div>
                    </div>
                  </section>

                  {/* Partner Info */}
                  <section>
                    <h3 className="font-semibold mb-3">Partner (Trusted Advisor)</h3>
                    <div className="rounded-lg p-4 grid grid-cols-2 gap-3 text-sm" style={{ backgroundColor: 'var(--background-subtle)' }}>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Company:</span>{' '}
                        <span className="font-medium">{selectedReg.ta_company_name}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Name:</span>{' '}
                        <span className="font-medium">{selectedReg.ta_full_name}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Email:</span>{' '}
                        <span className="font-medium">{selectedReg.ta_email}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Phone:</span>{' '}
                        <span className="font-medium">{selectedReg.ta_phone || '-'}</span>
                      </div>
                    </div>
                  </section>

                  {/* TSD Info */}
                  <section>
                    <h3 className="font-semibold mb-3">TSD Information</h3>
                    <div className="rounded-lg p-4 grid grid-cols-2 gap-3 text-sm" style={{ backgroundColor: 'var(--background-subtle)' }}>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>TSD:</span>{' '}
                        <span className="font-medium">{selectedReg.tsd_name}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Contact:</span>{' '}
                        <span className="font-medium">{selectedReg.tsd_contact_name || '-'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--foreground-muted)' }}>Email:</span>{' '}
                        <span className="font-medium">{selectedReg.tsd_contact_email || '-'}</span>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex gap-3 pt-6 mt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
                {editMode ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="btn btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn btn-primary flex-1"
                    >
                      {saving ? (
                        <>
                          <svg className="w-4 h-4 spinner" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="btn btn-primary w-full"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Registration
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
