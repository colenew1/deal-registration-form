'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
      // Refresh selected deal
      const updated = deals.find(d => d.id === selectedDeal.id)
      if (updated) setSelectedDeal({ ...updated, ...editData } as UnifiedDeal)
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
        body: JSON.stringify({
          ...data,
          source: selectedDeal.type,
          submitted_at: new Date().toISOString(),
        }),
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
    const baseUrl = window.location.origin
    const prefillUrl = `${baseUrl}/register/${selectedDeal.id}?requestInfo=true`
    await navigator.clipboard.writeText(prefillUrl)
    await fetch(`/api/email-intake/${selectedDeal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'reviewed' }),
    })
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const missingFields = selectedDeal ? getMissingFields(editMode ? editData as UnifiedDeal : selectedDeal) : []
  const canSend = missingFields.length === 0 && !selectedDeal?.has_conflicts

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Minimal Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Deal Registrations</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{profile?.full_name}</span>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-sm text-slate-500 hover:text-slate-700">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Clean Tab Bar */}
        <div className="flex gap-1 mb-6">
          {[
            { id: 'inbox', label: 'Inbox', count: stats.inbox },
            { id: 'pending_info', label: 'Waiting', count: stats.pending_info },
            { id: 'ready', label: 'Ready', count: stats.ready },
            { id: 'archive', label: 'Archive', count: stats.archive },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                  activeTab === tab.id ? 'bg-blue-500' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Deal List */}
          <div className={`${selectedDeal ? 'w-1/2' : 'w-full'} transition-all`}>
            <div className="space-y-2">
              {filteredDeals.map(deal => {
                const missing = getMissingFields(deal)
                const isSelected = selectedDeal?.id === deal.id

                return (
                  <button
                    key={`${deal.type}-${deal.id}`}
                    onClick={() => { setSelectedDeal(deal); setEditMode(false); setEditData({}) }}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-white border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-slate-900">
                          {deal.customer_company_name || 'Unknown Company'}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {deal.customer_first_name} {deal.customer_last_name}
                          {deal.customer_email && ` • ${deal.customer_email}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">{formatDate(deal.created_at)}</p>
                        <p className="text-xs text-slate-400">{formatTime(deal.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        deal.type === 'email_intake' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {deal.source_label}
                      </span>
                      {deal.tsd_name && (
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                          {deal.tsd_name}
                        </span>
                      )}
                      {deal.ta_company_name && (
                        <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                          {deal.ta_company_name}
                        </span>
                      )}
                      {missing.length > 0 && deal.status !== 'completed' && deal.status !== 'rejected' && (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                          {missing.length} missing
                        </span>
                      )}
                      {deal.has_conflicts && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                          Conflicts
                        </span>
                      )}
                      {deal.status === 'completed' && (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">Sent</span>
                      )}
                      {deal.status === 'rejected' && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">Rejected</span>
                      )}
                    </div>
                  </button>
                )
              })}

              {filteredDeals.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <p>No deals in {activeTab === 'archive' ? 'archive' : activeTab.replace('_', ' ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedDeal && (
            <div className="w-1/2 bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Panel Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">{selectedDeal.customer_company_name || 'Unknown Company'}</h2>
                  <p className="text-sm text-slate-500">{selectedDeal.source_label} • {formatDate(selectedDeal.created_at)}</p>
                </div>
                <button onClick={() => { setSelectedDeal(null); setEditMode(false) }} className="p-1 hover:bg-slate-100 rounded">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 max-h-[calc(100vh-280px)] overflow-y-auto space-y-6">
                {/* Alerts */}
                {missingFields.length > 0 && selectedDeal.status !== 'completed' && selectedDeal.status !== 'rejected' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-medium text-amber-800">Missing: {missingFields.join(', ')}</p>
                  </div>
                )}

                {selectedDeal.has_conflicts && selectedDeal.conflicts && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
                    <p className="text-sm font-medium text-red-800">Resolve conflicts:</p>
                    {selectedDeal.conflicts.map((c, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-red-100">
                        <p className="text-xs font-medium text-slate-500 mb-2">{c.field.replace(/_/g, ' ')}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleResolveConflict(i, false)} className="p-2 text-left text-sm border border-slate-200 rounded hover:border-blue-500 hover:bg-blue-50">
                            <span className="text-xs text-slate-400">Yours:</span>
                            <p className="truncate">{String(c.admin_value || '-')}</p>
                          </button>
                          <button onClick={() => handleResolveConflict(i, true)} className="p-2 text-left text-sm border border-slate-200 rounded hover:border-blue-500 hover:bg-blue-50">
                            <span className="text-xs text-slate-400">Partner:</span>
                            <p className="truncate">{String(c.partner_value || '-')}</p>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Original Email */}
                {selectedDeal.email_body_plain && (
                  <details className="group">
                    <summary className="text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-700">
                      Original Email
                    </summary>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {selectedDeal.email_body_plain}
                    </div>
                  </details>
                )}

                {/* Form Sections */}
                <Section title="Customer" editMode={editMode}>
                  <Field label="Company" value={editMode ? editData.customer_company_name : selectedDeal.customer_company_name} field="customer_company_name" onChange={v => setEditData(p => ({ ...p, customer_company_name: v }))} editMode={editMode} required />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="First Name" value={editMode ? editData.customer_first_name : selectedDeal.customer_first_name} field="customer_first_name" onChange={v => setEditData(p => ({ ...p, customer_first_name: v }))} editMode={editMode} required />
                    <Field label="Last Name" value={editMode ? editData.customer_last_name : selectedDeal.customer_last_name} field="customer_last_name" onChange={v => setEditData(p => ({ ...p, customer_last_name: v }))} editMode={editMode} required />
                  </div>
                  <Field label="Email" value={editMode ? editData.customer_email : selectedDeal.customer_email} field="customer_email" onChange={v => setEditData(p => ({ ...p, customer_email: v }))} editMode={editMode} required />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Phone" value={editMode ? editData.customer_phone : selectedDeal.customer_phone} field="customer_phone" onChange={v => setEditData(p => ({ ...p, customer_phone: v }))} editMode={editMode} />
                    <Field label="Title" value={editMode ? editData.customer_job_title : selectedDeal.customer_job_title} field="customer_job_title" onChange={v => setEditData(p => ({ ...p, customer_job_title: v }))} editMode={editMode} />
                  </div>
                </Section>

                <Section title="Partner" editMode={editMode}>
                  <Field label="Name" value={editMode ? editData.ta_full_name : selectedDeal.ta_full_name} field="ta_full_name" onChange={v => setEditData(p => ({ ...p, ta_full_name: v }))} editMode={editMode} required />
                  <Field label="Company" value={editMode ? editData.ta_company_name : selectedDeal.ta_company_name} field="ta_company_name" onChange={v => setEditData(p => ({ ...p, ta_company_name: v }))} editMode={editMode} required />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Email" value={editMode ? editData.ta_email : selectedDeal.ta_email} field="ta_email" onChange={v => setEditData(p => ({ ...p, ta_email: v }))} editMode={editMode} required />
                    <Field label="Phone" value={editMode ? editData.ta_phone : selectedDeal.ta_phone} field="ta_phone" onChange={v => setEditData(p => ({ ...p, ta_phone: v }))} editMode={editMode} />
                  </div>
                </Section>

                <Section title="TSD" editMode={editMode}>
                  {editMode ? (
                    <select value={editData.tsd_name || ''} onChange={e => setEditData(p => ({ ...p, tsd_name: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select TSD...</option>
                      {TSD_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <Field label="TSD" value={selectedDeal.tsd_name} field="tsd_name" onChange={() => {}} editMode={false} required />
                  )}
                </Section>

                <Section title="Opportunity" editMode={editMode}>
                  <div className="grid grid-cols-2 gap-3">
                    {editMode ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Agents</label>
                          <select value={editData.agent_count || ''} onChange={e => setEditData(p => ({ ...p, agent_count: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                            <option value="">Select...</option>
                            {AGENT_COUNT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Timeline</label>
                          <select value={editData.implementation_timeline || ''} onChange={e => setEditData(p => ({ ...p, implementation_timeline: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                            <option value="">Select...</option>
                            {TIMELINE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <Field label="Agents" value={selectedDeal.agent_count} field="agent_count" onChange={() => {}} editMode={false} />
                        <Field label="Timeline" value={selectedDeal.implementation_timeline} field="implementation_timeline" onChange={() => {}} editMode={false} />
                      </>
                    )}
                  </div>
                  {editMode ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-2">Solutions</label>
                      <div className="flex flex-wrap gap-2">
                        {SOLUTIONS_OPTIONS.map(s => {
                          const selected = (editData.solutions_interested || []).includes(s)
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                const current = editData.solutions_interested || []
                                setEditData(p => ({
                                  ...p,
                                  solutions_interested: selected ? current.filter(x => x !== s) : [...current, s]
                                }))
                              }}
                              className={`px-2 py-1 rounded text-xs ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                              {s}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Solutions</label>
                      <div className="flex flex-wrap gap-1">
                        {(selectedDeal.solutions_interested || []).length > 0 ?
                          selectedDeal.solutions_interested!.map(s => (
                            <span key={s} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{s}</span>
                          )) :
                          <span className="text-sm text-slate-400">-</span>
                        }
                      </div>
                    </div>
                  )}
                  {editMode ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                      <textarea
                        value={editData.opportunity_description || ''}
                        onChange={e => setEditData(p => ({ ...p, opportunity_description: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
                      />
                    </div>
                  ) : selectedDeal.opportunity_description && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                      <p className="text-sm text-slate-600">{selectedDeal.opportunity_description}</p>
                    </div>
                  )}
                </Section>
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                {editMode ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditMode(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-white">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ) : selectedDeal.status === 'completed' || selectedDeal.status === 'rejected' ? (
                  <p className="text-sm text-slate-500 text-center">
                    {selectedDeal.status === 'completed' ? 'Sent to HubSpot' : 'Rejected'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={handleSendToHubSpot}
                      disabled={!canSend || sendingToHubSpot}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        canSend
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {sendingToHubSpot ? 'Sending...' : canSend ? 'Send to HubSpot' : 'Complete required fields'}
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditMode(true); setEditData({ ...selectedDeal }) }} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-white">
                        Edit
                      </button>
                      {selectedDeal.type === 'email_intake' && (
                        <button onClick={handleRequestInfo} className="flex-1 px-4 py-2 border border-amber-300 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-50">
                          Request Info
                        </button>
                      )}
                      <button onClick={handleReject} className="px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
                        Reject
                      </button>
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

function Section({ title, children, editMode }: { title: string; children: React.ReactNode; editMode: boolean }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, value, field, onChange, editMode, required }: {
  label: string
  value: string | undefined
  field: string
  onChange: (v: string) => void
  editMode: boolean
  required?: boolean
}) {
  const empty = !value || value.trim() === ''

  if (editMode) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          {label}{required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            required && empty ? 'border-red-300 bg-red-50' : 'border-slate-300'
          }`}
        />
      </div>
    )
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <p className={`text-sm ${empty ? 'text-slate-400' : 'text-slate-900'}`}>{value || '-'}</p>
    </div>
  )
}
