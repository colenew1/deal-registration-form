'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient, type UserProfile, type EmailIntake, type DealRegistration } from '@/lib/supabase'

type UnifiedDeal = {
  id: string
  type: 'email_intake' | 'form_submission'
  status: 'inbox' | 'pending_info' | 'ready' | 'completed' | 'rejected'
  created_at: string
  updated_at: string
  source_label: string
  email_subject?: string
  email_from?: string
  customer_company_name: string
  customer_first_name: string
  customer_last_name: string
  customer_email: string
  customer_phone?: string
  customer_job_title?: string
  ta_full_name: string
  ta_company_name: string
  ta_email: string
  ta_phone?: string
  tsd_name: string
  tsd_contact_name?: string
  tsd_contact_email?: string
  agent_count?: string
  implementation_timeline?: string
  solutions_interested?: string[]
  opportunity_description?: string
  has_conflicts?: boolean
  conflicts?: Array<{ field: string; admin_value: unknown; partner_value: unknown }>
  email_body_plain?: string
  rejection_reason?: string
  original_data: EmailIntake | DealRegistration
}

const TSD_OPTIONS = ['Avant', 'Telarus', 'Intelisys', 'Sandler Partners', 'AppSmart', 'TBI', 'Bridgepointe', 'Other']
const AGENT_COUNT_OPTIONS = ['1-19', '20-49', '50-100', '101 to 249', '250 to 499', '500 to 999', '1000 to 2499', '2500 to 4999', '5000+']
const TIMELINE_OPTIONS = ['0-3 months', '4-6 months', '6-12 months', '12+ months']
const SOLUTIONS_OPTIONS = ['Performance Management', 'Coaching', 'Conversation Intelligence & Analytics', 'Data Consolidation for CX', 'AutoQA / QA', 'Gamification', 'Other']

const REQUIRED_FIELDS = [
  { key: 'customer_first_name', label: 'Customer First Name' },
  { key: 'customer_last_name', label: 'Customer Last Name' },
  { key: 'customer_company_name', label: 'Company' },
  { key: 'customer_email', label: 'Customer Email' },
  { key: 'ta_full_name', label: 'Partner Name' },
  { key: 'ta_email', label: 'Partner Email' },
  { key: 'ta_company_name', label: 'Partner Company' },
  { key: 'tsd_name', label: 'TSD' },
]

const ZAPIER_WEBHOOK_URL = process.env.NEXT_PUBLIC_ZAPIER_WEBHOOK_URL || ''

function getMissingFields(deal: Partial<UnifiedDeal>): string[] {
  return REQUIRED_FIELDS.filter(f => !deal[f.key as keyof UnifiedDeal]).map(f => f.label)
}

function mapEmailIntakeStatus(intake: EmailIntake): UnifiedDeal['status'] {
  if (intake.status === 'converted') return 'completed'
  if (intake.status === 'discarded') return 'rejected'
  if (intake.status === 'reviewed') return 'pending_info'
  return 'inbox'
}

function mapFormStatus(reg: DealRegistration): UnifiedDeal['status'] {
  if (reg.status === 'approved') return 'completed'
  if (reg.status === 'rejected') return 'rejected'
  return 'inbox'
}

function emailIntakeToUnified(intake: EmailIntake): UnifiedDeal {
  const deal: Partial<UnifiedDeal> = {
    customer_first_name: intake.extracted_customer_first_name || '',
    customer_last_name: intake.extracted_customer_last_name || '',
    customer_company_name: intake.extracted_customer_company_name || '',
    customer_email: intake.extracted_customer_email || '',
    ta_full_name: intake.extracted_ta_full_name || '',
    ta_email: intake.extracted_ta_email || '',
    ta_company_name: intake.extracted_ta_company_name || '',
    tsd_name: intake.extracted_tsd_name || '',
  }
  const missingFields = getMissingFields(deal)
  let status = mapEmailIntakeStatus(intake)
  if (missingFields.length === 0 && (status === 'inbox' || status === 'pending_info') && !intake.has_conflicts) {
    status = 'ready'
  }
  return {
    id: intake.id,
    type: 'email_intake',
    status,
    created_at: intake.created_at,
    updated_at: intake.updated_at,
    source_label: 'Email',
    email_subject: intake.email_subject || undefined,
    email_from: intake.email_from || undefined,
    customer_company_name: intake.extracted_customer_company_name || '',
    customer_first_name: intake.extracted_customer_first_name || '',
    customer_last_name: intake.extracted_customer_last_name || '',
    customer_email: intake.extracted_customer_email || '',
    customer_phone: intake.extracted_customer_phone || undefined,
    customer_job_title: intake.extracted_customer_job_title || undefined,
    ta_full_name: intake.extracted_ta_full_name || '',
    ta_company_name: intake.extracted_ta_company_name || '',
    ta_email: intake.extracted_ta_email || '',
    ta_phone: intake.extracted_ta_phone || undefined,
    tsd_name: intake.extracted_tsd_name || '',
    tsd_contact_name: intake.extracted_tsd_contact_name || undefined,
    tsd_contact_email: intake.extracted_tsd_contact_email || undefined,
    agent_count: intake.extracted_agent_count || undefined,
    implementation_timeline: intake.extracted_implementation_timeline || undefined,
    solutions_interested: intake.extracted_solutions_interested || undefined,
    opportunity_description: intake.extracted_opportunity_description || undefined,
    has_conflicts: intake.has_conflicts ?? undefined,
    conflicts: intake.conflicts || undefined,
    email_body_plain: intake.email_body_plain || undefined,
    original_data: intake,
  }
}

function formSubmissionToUnified(reg: DealRegistration): UnifiedDeal {
  return {
    id: reg.id,
    type: 'form_submission',
    status: mapFormStatus(reg),
    created_at: reg.created_at,
    updated_at: reg.updated_at || reg.created_at,
    source_label: 'Form',
    customer_company_name: reg.customer_company_name || '',
    customer_first_name: reg.customer_first_name || '',
    customer_last_name: reg.customer_last_name || '',
    customer_email: reg.customer_email || '',
    customer_phone: reg.customer_phone || undefined,
    customer_job_title: reg.customer_job_title || undefined,
    ta_full_name: reg.ta_full_name || '',
    ta_company_name: reg.ta_company_name || '',
    ta_email: reg.ta_email || '',
    ta_phone: reg.ta_phone || undefined,
    tsd_name: reg.tsd_name || '',
    tsd_contact_name: reg.tsd_contact_name || undefined,
    tsd_contact_email: reg.tsd_contact_email || undefined,
    agent_count: reg.agent_count || undefined,
    implementation_timeline: reg.implementation_timeline || undefined,
    solutions_interested: reg.solutions_interested || undefined,
    opportunity_description: reg.opportunity_description || undefined,
    rejection_reason: reg.rejection_reason || undefined,
    original_data: reg,
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = useMemo(() => createClientComponentClient(), [])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [deals, setDeals] = useState<UnifiedDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'inbox' | 'pending_info' | 'ready' | 'archive'>('inbox')
  const [selectedDeal, setSelectedDeal] = useState<UnifiedDeal | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<UnifiedDeal>>({})
  const [saving, setSaving] = useState(false)
  const [sendingToHubSpot, setSendingToHubSpot] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login?redirect=/admin'); return }
      const { data: profileData, error } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
      if (error || !profileData || profileData.role !== 'admin') { router.push('/partner/dashboard'); return }
      setProfile(profileData)
      setIsAuthChecking(false)
    }
    checkAuth()
  }, [router, supabase])

  const fetchData = useCallback(async () => {
    try {
      const [intakesResult, registrationsResult] = await Promise.all([
        supabase.from('email_intakes').select('*').order('created_at', { ascending: false }),
        supabase.from('deal_registrations').select('*').order('created_at', { ascending: false }),
      ])
      const allDeals = [
        ...(intakesResult.data || []).map(emailIntakeToUnified),
        ...(registrationsResult.data || []).map(formSubmissionToUnified),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setDeals(allDeals)
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { if (!isAuthChecking) fetchData() }, [isAuthChecking, fetchData])

  const filteredDeals = useMemo(() => {
    if (activeTab === 'archive') return deals.filter(d => d.status === 'completed' || d.status === 'rejected')
    return deals.filter(d => d.status === activeTab)
  }, [deals, activeTab])

  const stats = useMemo(() => ({
    inbox: deals.filter(d => d.status === 'inbox').length,
    pending_info: deals.filter(d => d.status === 'pending_info').length,
    ready: deals.filter(d => d.status === 'ready').length,
    archive: deals.filter(d => d.status === 'completed' || d.status === 'rejected').length,
  }), [deals])

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const formatTime = (date: string) => new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const handleSave = async () => {
    if (!selectedDeal) return
    setSaving(true)
    try {
      if (selectedDeal.type === 'email_intake') {
        await supabase.from('email_intakes').update({
          extracted_customer_first_name: editData.customer_first_name,
          extracted_customer_last_name: editData.customer_last_name,
          extracted_customer_company_name: editData.customer_company_name,
          extracted_customer_email: editData.customer_email,
          extracted_customer_phone: editData.customer_phone,
          extracted_customer_job_title: editData.customer_job_title,
          extracted_ta_full_name: editData.ta_full_name,
          extracted_ta_company_name: editData.ta_company_name,
          extracted_ta_email: editData.ta_email,
          extracted_ta_phone: editData.ta_phone,
          extracted_tsd_name: editData.tsd_name,
          extracted_tsd_contact_name: editData.tsd_contact_name,
          extracted_tsd_contact_email: editData.tsd_contact_email,
          extracted_agent_count: editData.agent_count,
          extracted_implementation_timeline: editData.implementation_timeline,
          extracted_solutions_interested: editData.solutions_interested,
          extracted_opportunity_description: editData.opportunity_description,
          updated_at: new Date().toISOString(),
        }).eq('id', selectedDeal.id)
      } else {
        await fetch(`/api/registrations/${selectedDeal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', ...editData }),
        })
      }
      await fetchData()
      setEditMode(false)
      setSelectedDeal({ ...selectedDeal, ...editData } as UnifiedDeal)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSendToHubSpot = async () => {
    if (!selectedDeal || !ZAPIER_WEBHOOK_URL) return
    setSendingToHubSpot(true)
    try {
      const data = editMode ? editData : selectedDeal
      await fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({ ...data, source: selectedDeal.type, submitted_at: new Date().toISOString() }),
      })
      if (selectedDeal.type === 'email_intake') {
        await supabase.from('email_intakes').update({ status: 'converted', converted_at: new Date().toISOString() }).eq('id', selectedDeal.id)
      } else {
        await fetch(`/api/registrations/${selectedDeal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve' }) })
      }
      await fetchData()
      setSelectedDeal(null)
      setEditMode(false)
    } catch (err) {
      console.error('HubSpot error:', err)
    } finally {
      setSendingToHubSpot(false)
    }
  }

  const handleRequestInfo = async () => {
    if (!selectedDeal || selectedDeal.type !== 'email_intake') return
    const prefillUrl = `${window.location.origin}/register/${selectedDeal.id}?requestInfo=true`
    await navigator.clipboard.writeText(prefillUrl)
    await fetch(`/api/email-intake/${selectedDeal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'reviewed' }) })
    alert('Link copied! Send it to the partner.')
    await fetchData()
  }

  const handleReject = async () => {
    if (!selectedDeal) return
    if (selectedDeal.type === 'email_intake') {
      await supabase.from('email_intakes').update({ status: 'discarded' }).eq('id', selectedDeal.id)
    } else {
      await fetch(`/api/registrations/${selectedDeal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject' }) })
    }
    await fetchData()
    setSelectedDeal(null)
  }

  const handleResolveConflict = async (index: number, usePartner: boolean) => {
    if (!selectedDeal?.conflicts) return
    const conflict = selectedDeal.conflicts[index]
    const newConflicts = selectedDeal.conflicts.filter((_, i) => i !== index)
    await supabase.from('email_intakes').update({
      [`extracted_${conflict.field}`]: usePartner ? conflict.partner_value : conflict.admin_value,
      conflicts: newConflicts.length > 0 ? newConflicts : null,
      has_conflicts: newConflicts.length > 0,
    }).eq('id', selectedDeal.id)
    await fetchData()
    const { data } = await supabase.from('email_intakes').select('*').eq('id', selectedDeal.id).single()
    if (data) setSelectedDeal(emailIntakeToUnified(data))
  }

  if (isAuthChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background-subtle)' }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--primary-600)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const missingFields = selectedDeal ? getMissingFields(editMode ? editData as UnifiedDeal : selectedDeal) : []
  const canSend = missingFields.length === 0 && !selectedDeal?.has_conflicts

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background-subtle)' }}>
      {/* Header */}
      <header className="page-header">
        <div className="container flex items-center justify-between">
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Deal Registrations</h1>
          <div className="flex items-center gap-4">
            <span style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>{profile?.full_name}</span>
            <Link href="/admin/users" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Manage Users
            </Link>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
        {/* Tab Bar */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'inbox', label: 'Inbox', count: stats.inbox },
            { id: 'pending_info', label: 'Waiting', count: stats.pending_info },
            { id: 'ready', label: 'Ready', count: stats.ready },
            { id: 'archive', label: 'Archive', count: stats.archive },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="btn"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--primary-600)' : 'var(--card-bg)',
                color: activeTab === tab.id ? 'white' : 'var(--foreground)',
                border: activeTab === tab.id ? 'none' : '1px solid var(--border-color)',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  marginLeft: '0.5rem',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--background-subtle)',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Deal List */}
          <div style={{ width: selectedDeal ? '50%' : '100%', transition: 'width 0.2s' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredDeals.map(deal => {
                const missing = getMissingFields(deal)
                const isSelected = selectedDeal?.id === deal.id

                return (
                  <button
                    key={`${deal.type}-${deal.id}`}
                    onClick={() => { setSelectedDeal(deal); setEditMode(false); setEditData({}) }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      backgroundColor: isSelected ? 'var(--primary-50)' : 'var(--card-bg)',
                      border: isSelected ? '2px solid var(--primary-500)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 500, color: 'var(--foreground)', margin: 0 }}>
                          {deal.customer_company_name || 'Unknown Company'}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)', margin: 0 }}>
                          {deal.customer_first_name} {deal.customer_last_name}
                          {deal.customer_email && ` • ${deal.customer_email}`}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', margin: 0 }}>{formatDate(deal.created_at)}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', margin: 0 }}>{formatTime(deal.created_at)}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 500, backgroundColor: deal.type === 'email_intake' ? 'var(--primary-100)' : 'var(--success-50)', color: deal.type === 'email_intake' ? 'var(--primary-700)' : 'var(--success-600)' }}>
                        {deal.source_label}
                      </span>
                      {deal.tsd_name && (
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', backgroundColor: 'var(--background-subtle)', color: 'var(--foreground-muted)' }}>
                          {deal.tsd_name}
                        </span>
                      )}
                      {deal.ta_company_name && (
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed' }}>
                          {deal.ta_company_name}
                        </span>
                      )}
                      {missing.length > 0 && deal.status !== 'completed' && deal.status !== 'rejected' && (
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', backgroundColor: 'var(--warning-50)', color: 'var(--warning-600)' }}>
                          {missing.length} missing
                        </span>
                      )}
                      {deal.has_conflicts && (
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', backgroundColor: 'var(--error-50)', color: 'var(--error-600)' }}>
                          Conflicts
                        </span>
                      )}
                      {deal.status === 'completed' && (
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', backgroundColor: 'var(--success-50)', color: 'var(--success-600)' }}>Sent</span>
                      )}
                      {deal.status === 'rejected' && (
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', backgroundColor: 'var(--error-50)', color: 'var(--error-600)' }}>Rejected</span>
                      )}
                    </div>
                  </button>
                )
              })}

              {filteredDeals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--foreground-muted)' }}>
                  No deals in {activeTab === 'archive' ? 'archive' : activeTab.replace('_', ' ')}
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedDeal && (
            <div className="card" style={{ width: '50%', overflow: 'hidden' }}>
              {/* Panel Header */}
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontWeight: 600, margin: 0 }}>{selectedDeal.customer_company_name || 'Unknown Company'}</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)', margin: 0 }}>{selectedDeal.source_label} • {formatDate(selectedDeal.created_at)}</p>
                </div>
                <button onClick={() => { setSelectedDeal(null); setEditMode(false) }} style={{ padding: '0.25rem', cursor: 'pointer', background: 'none', border: 'none' }}>
                  <svg style={{ width: '1.25rem', height: '1.25rem', color: 'var(--foreground-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div style={{ padding: '1.5rem', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                {/* Alerts */}
                {missingFields.length > 0 && selectedDeal.status !== 'completed' && selectedDeal.status !== 'rejected' && (
                  <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                    <strong>Missing:</strong> {missingFields.join(', ')}
                  </div>
                )}

                {selectedDeal.has_conflicts && selectedDeal.conflicts && (
                  <div style={{ padding: '1rem', backgroundColor: 'var(--error-50)', border: '1px solid var(--error-500)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    <p style={{ fontWeight: 500, color: 'var(--error-600)', marginBottom: '0.75rem' }}>Resolve conflicts:</p>
                    {selectedDeal.conflicts.map((c, i) => (
                      <div key={i} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--foreground-muted)', marginBottom: '0.5rem' }}>{c.field.replace(/_/g, ' ')}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <button onClick={() => handleResolveConflict(i, false)} className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.75rem', textAlign: 'left' }}>
                            <span style={{ display: 'block', fontSize: '0.625rem', color: 'var(--foreground-muted)' }}>Yours:</span>
                            {String(c.admin_value || '-')}
                          </button>
                          <button onClick={() => handleResolveConflict(i, true)} className="btn btn-primary" style={{ padding: '0.5rem', fontSize: '0.75rem', textAlign: 'left' }}>
                            <span style={{ display: 'block', fontSize: '0.625rem', opacity: 0.8 }}>Partner:</span>
                            {String(c.partner_value || '-')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Original Email */}
                {selectedDeal.email_body_plain && (
                  <details style={{ marginBottom: '1.5rem' }}>
                    <summary style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground-muted)', cursor: 'pointer' }}>Original Email</summary>
                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--background-subtle)', borderRadius: '0.5rem', fontSize: '0.875rem', whiteSpace: 'pre-wrap', maxHeight: '10rem', overflowY: 'auto' }}>
                      {selectedDeal.email_body_plain}
                    </div>
                  </details>
                )}

                {/* Form Sections */}
                <Section title="Customer">
                  <Field label="Company" value={editMode ? editData.customer_company_name : selectedDeal.customer_company_name} onChange={v => setEditData(p => ({ ...p, customer_company_name: v }))} editMode={editMode} required />
                  <div className="grid-form">
                    <Field label="First Name" value={editMode ? editData.customer_first_name : selectedDeal.customer_first_name} onChange={v => setEditData(p => ({ ...p, customer_first_name: v }))} editMode={editMode} required />
                    <Field label="Last Name" value={editMode ? editData.customer_last_name : selectedDeal.customer_last_name} onChange={v => setEditData(p => ({ ...p, customer_last_name: v }))} editMode={editMode} required />
                  </div>
                  <Field label="Email" value={editMode ? editData.customer_email : selectedDeal.customer_email} onChange={v => setEditData(p => ({ ...p, customer_email: v }))} editMode={editMode} required />
                  <div className="grid-form">
                    <Field label="Phone" value={editMode ? editData.customer_phone : selectedDeal.customer_phone} onChange={v => setEditData(p => ({ ...p, customer_phone: v }))} editMode={editMode} />
                    <Field label="Title" value={editMode ? editData.customer_job_title : selectedDeal.customer_job_title} onChange={v => setEditData(p => ({ ...p, customer_job_title: v }))} editMode={editMode} />
                  </div>
                </Section>

                <Section title="Partner">
                  <Field label="Name" value={editMode ? editData.ta_full_name : selectedDeal.ta_full_name} onChange={v => setEditData(p => ({ ...p, ta_full_name: v }))} editMode={editMode} required />
                  <Field label="Company" value={editMode ? editData.ta_company_name : selectedDeal.ta_company_name} onChange={v => setEditData(p => ({ ...p, ta_company_name: v }))} editMode={editMode} required />
                  <div className="grid-form">
                    <Field label="Email" value={editMode ? editData.ta_email : selectedDeal.ta_email} onChange={v => setEditData(p => ({ ...p, ta_email: v }))} editMode={editMode} required />
                    <Field label="Phone" value={editMode ? editData.ta_phone : selectedDeal.ta_phone} onChange={v => setEditData(p => ({ ...p, ta_phone: v }))} editMode={editMode} />
                  </div>
                </Section>

                <Section title="TSD">
                  {editMode ? (
                    <div className="form-group">
                      <label className="form-label">TSD <span style={{ color: 'var(--error-500)' }}>*</span></label>
                      <select value={editData.tsd_name || ''} onChange={e => setEditData(p => ({ ...p, tsd_name: e.target.value }))} className="form-input form-select">
                        <option value="">Select TSD...</option>
                        {TSD_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  ) : (
                    <Field label="TSD" value={selectedDeal.tsd_name} onChange={() => {}} editMode={false} required />
                  )}
                </Section>

                <Section title="Opportunity">
                  <div className="grid-form">
                    {editMode ? (
                      <>
                        <div className="form-group">
                          <label className="form-label">Agents</label>
                          <select value={editData.agent_count || ''} onChange={e => setEditData(p => ({ ...p, agent_count: e.target.value }))} className="form-input form-select">
                            <option value="">Select...</option>
                            {AGENT_COUNT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Timeline</label>
                          <select value={editData.implementation_timeline || ''} onChange={e => setEditData(p => ({ ...p, implementation_timeline: e.target.value }))} className="form-input form-select">
                            <option value="">Select...</option>
                            {TIMELINE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <Field label="Agents" value={selectedDeal.agent_count} onChange={() => {}} editMode={false} />
                        <Field label="Timeline" value={selectedDeal.implementation_timeline} onChange={() => {}} editMode={false} />
                      </>
                    )}
                  </div>
                  {editMode ? (
                    <div className="form-group">
                      <label className="form-label">Solutions</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {SOLUTIONS_OPTIONS.map(s => {
                          const selected = (editData.solutions_interested || []).includes(s)
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                const current = editData.solutions_interested || []
                                setEditData(p => ({ ...p, solutions_interested: selected ? current.filter(x => x !== s) : [...current, s] }))
                              }}
                              className="btn"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', backgroundColor: selected ? 'var(--primary-600)' : 'var(--background-subtle)', color: selected ? 'white' : 'var(--foreground)', border: 'none' }}
                            >
                              {s}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Solutions</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {(selectedDeal.solutions_interested || []).length > 0 ?
                          selectedDeal.solutions_interested!.map(s => (
                            <span key={s} style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)', borderRadius: '0.25rem', fontSize: '0.75rem' }}>{s}</span>
                          )) :
                          <span style={{ color: 'var(--foreground-muted)' }}>-</span>
                        }
                      </div>
                    </div>
                  )}
                  {editMode ? (
                    <div className="form-group">
                      <label className="form-label">Notes</label>
                      <textarea value={editData.opportunity_description || ''} onChange={e => setEditData(p => ({ ...p, opportunity_description: e.target.value }))} rows={2} className="form-input form-textarea" />
                    </div>
                  ) : selectedDeal.opportunity_description && (
                    <div className="form-group">
                      <label className="form-label">Notes</label>
                      <p style={{ fontSize: '0.875rem', color: 'var(--foreground)' }}>{selectedDeal.opportunity_description}</p>
                    </div>
                  )}
                </Section>
              </div>

              {/* Actions Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--background-subtle)' }}>
                {editMode ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setEditMode(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>{saving ? 'Saving...' : 'Save'}</button>
                  </div>
                ) : selectedDeal.status === 'completed' || selectedDeal.status === 'rejected' ? (
                  <p style={{ textAlign: 'center', color: 'var(--foreground-muted)', fontSize: '0.875rem' }}>
                    {selectedDeal.status === 'completed' ? 'Sent to HubSpot' : 'Rejected'}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button onClick={handleSendToHubSpot} disabled={!canSend || sendingToHubSpot} className="btn" style={{ width: '100%', backgroundColor: canSend ? 'var(--success-500)' : 'var(--gray-300)', color: 'white', cursor: canSend ? 'pointer' : 'not-allowed' }}>
                      {sendingToHubSpot ? 'Sending...' : canSend ? 'Send to HubSpot' : 'Complete required fields'}
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setEditMode(true); setEditData({ ...selectedDeal }) }} className="btn btn-secondary" style={{ flex: 1 }}>Edit</button>
                      {selectedDeal.type === 'email_intake' && (
                        <button onClick={handleRequestInfo} className="btn" style={{ flex: 1, backgroundColor: 'var(--warning-50)', color: 'var(--warning-600)', border: '1px solid var(--warning-500)' }}>Request Info</button>
                      )}
                      <button onClick={handleReject} className="btn" style={{ backgroundColor: 'var(--error-50)', color: 'var(--error-600)', border: '1px solid var(--error-500)' }}>Reject</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, editMode, required }: { label: string; value: string | undefined; onChange: (v: string) => void; editMode: boolean; required?: boolean }) {
  const empty = !value || value.trim() === ''

  if (editMode) {
    return (
      <div className="form-group">
        <label className="form-label">{label}{required && <span style={{ color: 'var(--error-500)' }}> *</span>}</label>
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="form-input" style={{ borderColor: required && empty ? 'var(--error-500)' : undefined }} />
      </div>
    )
  }

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <p style={{ fontSize: '0.875rem', color: empty ? 'var(--foreground-muted)' : 'var(--foreground)' }}>{value || '-'}</p>
    </div>
  )
}
