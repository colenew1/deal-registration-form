'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient, type UserProfile, type EmailIntake } from '@/lib/supabase'

const TSD_OPTIONS = [
  'Avant',
  'Telarus',
  'Intelisys',
  'Sandler Partners',
  'AppSmart',
  'TBI',
  'Bridgepointe',
  'Other',
]

const AGENT_COUNT_OPTIONS = [
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

const TIMELINE_OPTIONS = [
  '0-3 months',
  '4-6 months',
  '6-12 months',
  '12+ months',
]

const SOLUTIONS_OPTIONS = [
  'Performance Management',
  'Coaching',
  'Conversation Intelligence & Analytics',
  'Data Consolidation for CX',
  'AutoQA / QA',
  'Gamification',
  'Other',
]

const ZAPIER_WEBHOOK_URL = process.env.NEXT_PUBLIC_ZAPIER_WEBHOOK_URL || ''

export default function AdminIntakesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClientComponentClient(), [])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [intakes, setIntakes] = useState<EmailIntake[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'converted'>('all')
  const [selectedIntake, setSelectedIntake] = useState<EmailIntake | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<EmailIntake>>({})
  const [saving, setSaving] = useState(false)
  const [sendingToZapier, setSendingToZapier] = useState(false)
  const [sendingToPartner, setSendingToPartner] = useState(false)
  const [partnerEmail, setPartnerEmail] = useState('')
  const [showSendToPartnerModal, setShowSendToPartnerModal] = useState(false)

  // Check authentication and admin role
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/admin/intakes')
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
      setIsAuthChecking(false)
      fetchIntakes()
    }

    checkAuth()
  }, [router, supabase])

  const fetchIntakes = async () => {
    try {
      const { data, error } = await supabase
        .from('email_intakes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setIntakes(data || [])

      // Auto-select intake if id param is present
      const intakeId = searchParams.get('id')
      if (intakeId && data) {
        const targetIntake = data.find(i => i.id === intakeId)
        if (targetIntake) {
          setSelectedIntake(targetIntake)
        }
      }
    } catch (err) {
      console.error('Failed to fetch intakes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleEdit = () => {
    if (selectedIntake) {
      setEditData({ ...selectedIntake })
      setEditMode(true)
    }
  }

  const handleSave = async () => {
    if (!selectedIntake) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('email_intakes')
        .update({
          extracted_ta_full_name: editData.extracted_ta_full_name,
          extracted_ta_email: editData.extracted_ta_email,
          extracted_ta_phone: editData.extracted_ta_phone,
          extracted_ta_company_name: editData.extracted_ta_company_name,
          extracted_tsd_name: editData.extracted_tsd_name,
          extracted_tsd_contact_name: editData.extracted_tsd_contact_name,
          extracted_tsd_contact_email: editData.extracted_tsd_contact_email,
          extracted_customer_first_name: editData.extracted_customer_first_name,
          extracted_customer_last_name: editData.extracted_customer_last_name,
          extracted_customer_company_name: editData.extracted_customer_company_name,
          extracted_customer_email: editData.extracted_customer_email,
          extracted_customer_phone: editData.extracted_customer_phone,
          extracted_customer_job_title: editData.extracted_customer_job_title,
          extracted_agent_count: editData.extracted_agent_count,
          extracted_implementation_timeline: editData.extracted_implementation_timeline,
          extracted_opportunity_description: editData.extracted_opportunity_description,
          status: 'reviewed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedIntake.id)

      if (error) throw error

      await fetchIntakes()
      setEditMode(false)
      setSelectedIntake(null)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleApproveAndSendToHubspot = async () => {
    if (!selectedIntake) return
    if (!ZAPIER_WEBHOOK_URL) {
      alert('Zapier webhook URL not configured. Please add NEXT_PUBLIC_ZAPIER_WEBHOOK_URL to environment variables.')
      return
    }
    setSendingToZapier(true)

    try {
      // Prepare data for HubSpot via Zapier
      const payload = {
        // Partner/TA Info
        ta_full_name: editMode ? editData.extracted_ta_full_name : selectedIntake.extracted_ta_full_name,
        ta_email: editMode ? editData.extracted_ta_email : selectedIntake.extracted_ta_email,
        ta_phone: editMode ? editData.extracted_ta_phone : selectedIntake.extracted_ta_phone,
        ta_company_name: editMode ? editData.extracted_ta_company_name : selectedIntake.extracted_ta_company_name,

        // TSD Info
        tsd_name: editMode ? editData.extracted_tsd_name : selectedIntake.extracted_tsd_name,
        tsd_contact_name: editMode ? editData.extracted_tsd_contact_name : selectedIntake.extracted_tsd_contact_name,
        tsd_contact_email: editMode ? editData.extracted_tsd_contact_email : selectedIntake.extracted_tsd_contact_email,

        // Customer Info
        customer_first_name: editMode ? editData.extracted_customer_first_name : selectedIntake.extracted_customer_first_name,
        customer_last_name: editMode ? editData.extracted_customer_last_name : selectedIntake.extracted_customer_last_name,
        customer_company_name: editMode ? editData.extracted_customer_company_name : selectedIntake.extracted_customer_company_name,
        customer_email: editMode ? editData.extracted_customer_email : selectedIntake.extracted_customer_email,
        customer_phone: editMode ? editData.extracted_customer_phone : selectedIntake.extracted_customer_phone,
        customer_job_title: editMode ? editData.extracted_customer_job_title : selectedIntake.extracted_customer_job_title,

        // Opportunity Info
        agent_count: editMode ? editData.extracted_agent_count : selectedIntake.extracted_agent_count,
        implementation_timeline: editMode ? editData.extracted_implementation_timeline : selectedIntake.extracted_implementation_timeline,
        opportunity_description: editMode ? editData.extracted_opportunity_description : selectedIntake.extracted_opportunity_description,

        // Metadata
        source: 'email_intake',
        intake_id: selectedIntake.id,
        submitted_at: new Date().toISOString(),
      }

      // Send to Zapier
      const response = await fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors', // Zapier webhooks don't support CORS
        body: JSON.stringify(payload),
      })

      // Update intake status to converted
      await supabase
        .from('email_intakes')
        .update({
          status: 'converted',
          converted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedIntake.id)

      alert('Successfully sent to HubSpot!')
      await fetchIntakes()
      setSelectedIntake(null)
      setEditMode(false)
    } catch (err) {
      console.error('Zapier error:', err)
      alert('Failed to send to HubSpot')
    } finally {
      setSendingToZapier(false)
    }
  }

  const handleSendToPartner = async () => {
    if (!selectedIntake || !partnerEmail) return
    setSendingToPartner(true)

    try {
      // Generate the prefill URL with the intake ID
      const baseUrl = window.location.origin
      const prefillUrl = `${baseUrl}/register/${selectedIntake.id}?requestInfo=true`

      // For now, copy to clipboard - in production you'd send an email
      await navigator.clipboard.writeText(prefillUrl)

      alert(`Form link copied to clipboard!\n\nSend this to ${partnerEmail}:\n${prefillUrl}`)

      // Update status
      await supabase
        .from('email_intakes')
        .update({
          status: 'reviewed',
          review_notes: `Sent to partner: ${partnerEmail}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedIntake.id)

      setShowSendToPartnerModal(false)
      setPartnerEmail('')
      await fetchIntakes()
    } catch (err) {
      console.error('Send to partner error:', err)
      alert('Failed to generate link')
    } finally {
      setSendingToPartner(false)
    }
  }

  const handleDelete = async (intakeId: string) => {
    if (!confirm('Are you sure you want to delete this email intake? This cannot be undone.')) {
      return
    }

    try {
      console.log('Deleting intake:', intakeId)
      const response = await fetch(`/api/email-intake/${intakeId}`, {
        method: 'DELETE',
      })

      console.log('Delete response status:', response.status)
      const data = await response.json()
      console.log('Delete response data:', data)

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to delete')
      }

      alert('Deleted successfully!')
      await fetchIntakes()
      setSelectedIntake(null)
      setEditMode(false)
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete intake: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleFieldChange = (field: string, value: string | string[]) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  const getConfidenceColor = (field: string) => {
    const scores = selectedIntake?.confidence_scores as Record<string, number> | null
    if (!scores || !scores[field]) return 'var(--error-500)' // Missing = red
    if (scores[field] >= 70) return 'var(--success-500)' // High = green
    if (scores[field] >= 40) return 'var(--warning-500)' // Medium = yellow
    return 'var(--error-500)' // Low = red
  }

  const isFieldLowConfidence = (field: string) => {
    const scores = selectedIntake?.confidence_scores as Record<string, number> | null
    if (!scores) return true
    return !scores[field] || scores[field] < 70
  }

  const filteredIntakes = intakes.filter(i =>
    filter === 'all' ? true : i.status === filter
  )

  const stats = {
    total: intakes.length,
    pending: intakes.filter(i => i.status === 'pending').length,
    reviewed: intakes.filter(i => i.status === 'reviewed').length,
    converted: intakes.filter(i => i.status === 'converted').length,
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'rgba(234, 179, 8, 0.1)', text: '#ca8a04' },
      reviewed: { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb' },
      converted: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a' },
      discarded: { bg: 'rgba(107, 114, 128, 0.1)', text: '#4b5563' },
    }
    const s = styles[status] || styles.pending
    return (
      <span
        className="px-2 py-1 rounded-full text-xs font-medium capitalize"
        style={{ backgroundColor: s.bg, color: s.text }}
      >
        {status}
      </span>
    )
  }

  if (isAuthChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background-subtle)' }}>
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary-600)', borderTopColor: 'transparent' }}></div>
          <p style={{ color: 'var(--foreground-muted)' }}>Loading...</p>
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
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary-600)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold">Email Intakes</h1>
                <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Review parsed email submissions</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin" className="btn btn-secondary">
                ← Back to Dashboard
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'var(--primary-600)' },
            { label: 'Pending', value: stats.pending, color: '#ca8a04' },
            { label: 'Reviewed', value: stats.reviewed, color: '#2563eb' },
            { label: 'Converted', value: stats.converted, color: '#16a34a' },
          ].map(stat => (
            <div key={stat.label} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'reviewed', 'converted'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Intakes Table */}
        <div className="rounded-xl overflow-x-auto" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <table className="w-full" style={{ minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>From</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Subject</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Customer</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>TSD</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Status</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Date</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIntakes.map(intake => (
                <tr key={intake.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td className="p-4">
                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>{intake.email_from_name || intake.email_from || '-'}</p>
                    <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{intake.email_from}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm truncate max-w-[200px]" style={{ color: 'var(--foreground)' }}>{intake.email_subject || '-'}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>{intake.extracted_customer_company_name || '-'}</p>
                    <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{intake.extracted_customer_email || '-'}</p>
                  </td>
                  <td className="p-4">
                    <p style={{ color: 'var(--foreground)' }}>{intake.extracted_tsd_name || '-'}</p>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(intake.status)}
                  </td>
                  <td className="p-4">
                    <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{formatDate(intake.created_at)}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedIntake(intake)}
                        className="btn btn-secondary"
                        style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        Review
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(intake.id); }}
                        className="btn"
                        style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--error-500)', color: 'white' }}
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredIntakes.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center" style={{ color: 'var(--foreground-muted)' }}>
                    No email intakes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Detail/Edit Modal */}
      {selectedIntake && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedIntake(null)
              setEditMode(false)
            }
          }}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                    {editMode ? 'Edit Intake' : 'Review Email Intake'}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--foreground-muted)' }}>
                    {selectedIntake.email_subject || 'No subject'}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedIntake(null); setEditMode(false); }}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Original Email Preview */}
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--background-subtle)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--foreground-muted)' }}>Original Email</h3>
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>
                  {selectedIntake.email_body_plain?.substring(0, 500)}
                  {(selectedIntake.email_body_plain?.length || 0) > 500 && '...'}
                </p>
              </div>

              {/* Extracted Fields */}
              <div className="space-y-6">
                {/* Partner/TA Info */}
                <section>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Partner (TA) Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="TA Full Name"
                      value={editMode ? editData.extracted_ta_full_name || '' : selectedIntake.extracted_ta_full_name || ''}
                      onChange={(v) => handleFieldChange('extracted_ta_full_name', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('ta_full_name')}
                      lowConfidence={isFieldLowConfidence('ta_full_name')}
                    />
                    <InputField
                      label="TA Email"
                      value={editMode ? editData.extracted_ta_email || '' : selectedIntake.extracted_ta_email || ''}
                      onChange={(v) => handleFieldChange('extracted_ta_email', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('ta_email')}
                      lowConfidence={isFieldLowConfidence('ta_email')}
                    />
                    <InputField
                      label="TA Phone"
                      value={editMode ? editData.extracted_ta_phone || '' : selectedIntake.extracted_ta_phone || ''}
                      onChange={(v) => handleFieldChange('extracted_ta_phone', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('ta_phone')}
                      lowConfidence={isFieldLowConfidence('ta_phone')}
                    />
                    <InputField
                      label="TA Company"
                      value={editMode ? editData.extracted_ta_company_name || '' : selectedIntake.extracted_ta_company_name || ''}
                      onChange={(v) => handleFieldChange('extracted_ta_company_name', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('ta_company_name')}
                      lowConfidence={isFieldLowConfidence('ta_company_name')}
                    />
                  </div>
                </section>

                {/* TSD Info */}
                <section>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>TSD Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {editMode ? (
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>TSD</label>
                        <select
                          value={editData.extracted_tsd_name || ''}
                          onChange={(e) => handleFieldChange('extracted_tsd_name', e.target.value)}
                          className="form-input form-select"
                          style={{ borderColor: isFieldLowConfidence('tsd_name') ? 'var(--error-500)' : undefined }}
                        >
                          <option value="">Select TSD...</option>
                          {TSD_OPTIONS.map(tsd => (
                            <option key={tsd} value={tsd}>{tsd}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <InputField
                        label="TSD"
                        value={selectedIntake.extracted_tsd_name || ''}
                        onChange={() => {}}
                        editMode={false}
                        confidence={getConfidenceColor('tsd_name')}
                        lowConfidence={isFieldLowConfidence('tsd_name')}
                      />
                    )}
                    <InputField
                      label="TSD Contact Name"
                      value={editMode ? editData.extracted_tsd_contact_name || '' : selectedIntake.extracted_tsd_contact_name || ''}
                      onChange={(v) => handleFieldChange('extracted_tsd_contact_name', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('tsd_contact_name')}
                      lowConfidence={isFieldLowConfidence('tsd_contact_name')}
                    />
                    <InputField
                      label="TSD Contact Email"
                      value={editMode ? editData.extracted_tsd_contact_email || '' : selectedIntake.extracted_tsd_contact_email || ''}
                      onChange={(v) => handleFieldChange('extracted_tsd_contact_email', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('tsd_contact_email')}
                      lowConfidence={isFieldLowConfidence('tsd_contact_email')}
                    />
                  </div>
                </section>

                {/* Customer Info */}
                <section>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="First Name"
                      value={editMode ? editData.extracted_customer_first_name || '' : selectedIntake.extracted_customer_first_name || ''}
                      onChange={(v) => handleFieldChange('extracted_customer_first_name', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('customer_first_name')}
                      lowConfidence={isFieldLowConfidence('customer_first_name')}
                    />
                    <InputField
                      label="Last Name"
                      value={editMode ? editData.extracted_customer_last_name || '' : selectedIntake.extracted_customer_last_name || ''}
                      onChange={(v) => handleFieldChange('extracted_customer_last_name', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('customer_last_name')}
                      lowConfidence={isFieldLowConfidence('customer_last_name')}
                    />
                    <InputField
                      label="Job Title"
                      value={editMode ? editData.extracted_customer_job_title || '' : selectedIntake.extracted_customer_job_title || ''}
                      onChange={(v) => handleFieldChange('extracted_customer_job_title', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('customer_job_title')}
                      lowConfidence={isFieldLowConfidence('customer_job_title')}
                    />
                    <InputField
                      label="Company Name"
                      value={editMode ? editData.extracted_customer_company_name || '' : selectedIntake.extracted_customer_company_name || ''}
                      onChange={(v) => handleFieldChange('extracted_customer_company_name', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('customer_company_name')}
                      lowConfidence={isFieldLowConfidence('customer_company_name')}
                    />
                    <InputField
                      label="Email"
                      value={editMode ? editData.extracted_customer_email || '' : selectedIntake.extracted_customer_email || ''}
                      onChange={(v) => handleFieldChange('extracted_customer_email', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('customer_email')}
                      lowConfidence={isFieldLowConfidence('customer_email')}
                    />
                    <InputField
                      label="Phone"
                      value={editMode ? editData.extracted_customer_phone || '' : selectedIntake.extracted_customer_phone || ''}
                      onChange={(v) => handleFieldChange('extracted_customer_phone', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('customer_phone')}
                      lowConfidence={isFieldLowConfidence('customer_phone')}
                    />
                    <div className="col-span-2">
                      <InputField
                        label="Street Address"
                        value={editMode ? editData.extracted_customer_street_address || '' : selectedIntake.extracted_customer_street_address || ''}
                        onChange={(v) => handleFieldChange('extracted_customer_street_address', v)}
                        editMode={editMode}
                        confidence={getConfidenceColor('customer_street_address')}
                        lowConfidence={isFieldLowConfidence('customer_street_address')}
                      />
                    </div>
                    <InputField
                      label="City"
                      value={editMode ? editData.extracted_customer_city || '' : selectedIntake.extracted_customer_city || ''}
                      onChange={(v) => handleFieldChange('extracted_customer_city', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('customer_city')}
                      lowConfidence={isFieldLowConfidence('customer_city')}
                    />
                    <InputField
                      label="State"
                      value={editMode ? editData.extracted_customer_state || '' : selectedIntake.extracted_customer_state || ''}
                      onChange={(v) => handleFieldChange('extracted_customer_state', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('customer_state')}
                      lowConfidence={isFieldLowConfidence('customer_state')}
                    />
                    <InputField
                      label="Postal Code"
                      value={editMode ? editData.extracted_customer_postal_code || '' : selectedIntake.extracted_customer_postal_code || ''}
                      onChange={(v) => handleFieldChange('extracted_customer_postal_code', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('customer_postal_code')}
                      lowConfidence={isFieldLowConfidence('customer_postal_code')}
                    />
                    <InputField
                      label="Country"
                      value={editMode ? editData.extracted_customer_country || '' : selectedIntake.extracted_customer_country || ''}
                      onChange={(v) => handleFieldChange('extracted_customer_country', v)}
                      editMode={editMode}
                      confidence={getConfidenceColor('customer_country')}
                      lowConfidence={isFieldLowConfidence('customer_country')}
                    />
                  </div>
                </section>

                {/* Opportunity Info */}
                <section>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Opportunity Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Agent Count Dropdown */}
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                        Agent Count
                        {isFieldLowConfidence('agent_count') && (
                          <span className="ml-2 text-xs" style={{ color: 'var(--error-500)' }}>• Needs review</span>
                        )}
                      </label>
                      {editMode ? (
                        <select
                          value={editData.extracted_agent_count || ''}
                          onChange={(e) => handleFieldChange('extracted_agent_count', e.target.value)}
                          className="form-input form-select"
                          style={{ borderColor: isFieldLowConfidence('agent_count') ? 'var(--error-500)' : undefined }}
                        >
                          <option value="">Select agent count...</option>
                          {AGENT_COUNT_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: 'var(--background-subtle)', color: 'var(--foreground)', borderLeft: `3px solid ${getConfidenceColor('agent_count')}` }}>
                          {selectedIntake.extracted_agent_count || '-'}
                        </p>
                      )}
                    </div>

                    {/* Timeline Dropdown */}
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                        Implementation Timeline
                        {isFieldLowConfidence('implementation_timeline') && (
                          <span className="ml-2 text-xs" style={{ color: 'var(--error-500)' }}>• Needs review</span>
                        )}
                      </label>
                      {editMode ? (
                        <select
                          value={editData.extracted_implementation_timeline || ''}
                          onChange={(e) => handleFieldChange('extracted_implementation_timeline', e.target.value)}
                          className="form-input form-select"
                          style={{ borderColor: isFieldLowConfidence('implementation_timeline') ? 'var(--error-500)' : undefined }}
                        >
                          <option value="">Select timeline...</option>
                          {TIMELINE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: 'var(--background-subtle)', color: 'var(--foreground)', borderLeft: `3px solid ${getConfidenceColor('implementation_timeline')}` }}>
                          {selectedIntake.extracted_implementation_timeline || '-'}
                        </p>
                      )}
                    </div>

                    {/* Solutions Checkboxes */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                        Solutions Interested
                        {isFieldLowConfidence('solutions_interested') && (
                          <span className="ml-2 text-xs" style={{ color: 'var(--error-500)' }}>• Needs review</span>
                        )}
                      </label>
                      {editMode ? (
                        <div className="flex flex-wrap gap-2">
                          {SOLUTIONS_OPTIONS.map(solution => {
                            const currentSolutions = (editData.extracted_solutions_interested as string[]) || []
                            const isChecked = currentSolutions.includes(solution)
                            return (
                              <button
                                key={solution}
                                type="button"
                                onClick={() => {
                                  const newSolutions = isChecked
                                    ? currentSolutions.filter(s => s !== solution)
                                    : [...currentSolutions, solution]
                                  handleFieldChange('extracted_solutions_interested', newSolutions)
                                }}
                                className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                                style={{
                                  backgroundColor: isChecked ? 'var(--primary-600)' : 'var(--background)',
                                  color: isChecked ? 'white' : 'var(--foreground)',
                                  border: '1px solid var(--card-border)',
                                }}
                              >
                                {solution}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(selectedIntake.extracted_solutions_interested || []).length > 0 ? (
                            (selectedIntake.extracted_solutions_interested || []).map(solution => (
                              <span
                                key={solution}
                                className="px-3 py-1.5 rounded-lg text-sm"
                                style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}
                              >
                                {solution}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: 'var(--foreground-muted)' }}>-</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                        Opportunity Description
                        {isFieldLowConfidence('opportunity_description') && (
                          <span className="ml-2 text-xs" style={{ color: 'var(--error-500)' }}>• Needs review</span>
                        )}
                      </label>
                      {editMode ? (
                        <textarea
                          value={editData.extracted_opportunity_description || ''}
                          onChange={(e) => handleFieldChange('extracted_opportunity_description', e.target.value)}
                          rows={4}
                          className="form-input form-textarea"
                          placeholder="Describe the opportunity, customer pain points, current solutions, etc."
                          style={{ borderColor: isFieldLowConfidence('opportunity_description') ? 'var(--error-500)' : undefined }}
                        />
                      ) : (
                        <p className="text-sm p-3 rounded-lg whitespace-pre-wrap" style={{ backgroundColor: 'var(--background-subtle)', color: 'var(--foreground)' }}>
                          {selectedIntake.extracted_opportunity_description || '-'}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-6" style={{ borderTop: '1px solid var(--card-border)' }}>
                {editMode ? (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="btn btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn btn-primary flex-1"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEdit}
                      className="btn btn-secondary flex-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setPartnerEmail(selectedIntake.extracted_ta_email || '')
                        setShowSendToPartnerModal(true)
                      }}
                      className="btn btn-secondary flex-1"
                      style={{ borderColor: 'var(--warning-500)', color: 'var(--warning-600)' }}
                    >
                      Send to Partner
                    </button>
                    <button
                      onClick={handleApproveAndSendToHubspot}
                      disabled={sendingToZapier}
                      className="btn btn-primary flex-1"
                      style={{ backgroundColor: 'var(--success-500)' }}
                    >
                      {sendingToZapier ? 'Sending...' : 'Approve & Send to HubSpot'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send to Partner Modal */}
      {showSendToPartnerModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSendToPartnerModal(false)
          }}
        >
          <div className="w-full max-w-md p-6 rounded-xl" style={{ backgroundColor: 'var(--card-bg)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
              Send Form to Partner
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--foreground-muted)' }}>
              This will generate a pre-filled form link for the partner to complete missing information.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                Partner Email
              </label>
              <input
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                className="form-input"
                placeholder="partner@company.com"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSendToPartnerModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSendToPartner}
                disabled={sendingToPartner || !partnerEmail}
                className="btn btn-primary flex-1"
              >
                {sendingToPartner ? 'Generating...' : 'Copy Form Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Reusable input field component
function InputField({
  label,
  value,
  onChange,
  editMode,
  confidence,
  lowConfidence,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  editMode: boolean
  confidence: string
  lowConfidence: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
        {label}
        {lowConfidence && (
          <span className="ml-2 text-xs" style={{ color: 'var(--error-500)' }}>• Needs review</span>
        )}
      </label>
      {editMode ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="form-input"
          style={{ borderColor: lowConfidence ? 'var(--error-500)' : undefined }}
        />
      ) : (
        <p
          className="text-sm p-3 rounded-lg"
          style={{
            backgroundColor: 'var(--background-subtle)',
            color: value ? 'var(--foreground)' : 'var(--foreground-muted)',
            borderLeft: `3px solid ${confidence}`,
          }}
        >
          {value || '-'}
        </p>
      )}
    </div>
  )
}
