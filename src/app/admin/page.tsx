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

const TSD_OPTIONS = ['Avant', 'Telarus']
const AGENT_COUNT_OPTIONS = ['1-19', '20-49', '50-100', '101 to 249', '250 to 499', '500 to 999', '1000 to 2499', '2500 to 4999', '5000+']
const TIMELINE_OPTIONS = ['0-3 months', '4-6 months', '6-12 months', '12+ months']
const SOLUTIONS_OPTIONS = ['Performance Management', 'Coaching', 'Conversation Intelligence & Analytics', 'Data Consolidation for CX', 'AutoQA / QA', 'Gamification', 'Other']

const REQUIRED_FIELDS = [
  { key: 'customer_first_name', label: 'Customer First Name' },
  { key: 'customer_last_name', label: 'Customer Last Name' },
  { key: 'customer_company_name', label: 'Company' },
  { key: 'customer_email', label: 'Customer Email' },
  { key: 'ta_full_name', label: 'TA Name' },
  { key: 'ta_email', label: 'TA Email' },
  { key: 'ta_company_name', label: 'TA Company' },
  { key: 'tsd_name', label: 'TSD' },
  { key: 'solutions_interested', label: 'Solutions' },
]

const ZAPIER_WEBHOOK_URL = process.env.NEXT_PUBLIC_ZAPIER_WEBHOOK_URL || ''

// Sanitize values that may come back as the string "null" or "undefined" from the database
function clean(val: string | null | undefined): string {
  if (!val || val === 'null' || val === 'undefined') return ''
  return val
}

function getMissingFields(deal: Partial<UnifiedDeal>): string[] {
  return REQUIRED_FIELDS.filter(f => {
    const val = deal[f.key as keyof UnifiedDeal]
    if (f.key === 'solutions_interested') {
      return !val || (Array.isArray(val) && val.length === 0)
    }
    return !val
  }).map(f => f.label)
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
    customer_first_name: clean(intake.extracted_customer_first_name),
    customer_last_name: clean(intake.extracted_customer_last_name),
    customer_company_name: clean(intake.extracted_customer_company_name),
    customer_email: clean(intake.extracted_customer_email),
    ta_full_name: clean(intake.extracted_ta_full_name),
    ta_email: clean(intake.extracted_ta_email),
    ta_company_name: clean(intake.extracted_ta_company_name),
    tsd_name: clean(intake.extracted_tsd_name),
    solutions_interested: intake.extracted_solutions_interested || [],
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
    source_label: clean(intake.email_from) ? 'Email' : 'Manual',
    email_subject: clean(intake.email_subject) || undefined,
    email_from: clean(intake.email_from) || undefined,
    customer_company_name: clean(intake.extracted_customer_company_name),
    customer_first_name: clean(intake.extracted_customer_first_name),
    customer_last_name: clean(intake.extracted_customer_last_name),
    customer_email: clean(intake.extracted_customer_email),
    customer_phone: clean(intake.extracted_customer_phone) || undefined,
    customer_job_title: clean(intake.extracted_customer_job_title) || undefined,
    ta_full_name: clean(intake.extracted_ta_full_name),
    ta_company_name: clean(intake.extracted_ta_company_name),
    ta_email: clean(intake.extracted_ta_email),
    ta_phone: clean(intake.extracted_ta_phone) || undefined,
    tsd_name: clean(intake.extracted_tsd_name),
    tsd_contact_name: clean(intake.extracted_tsd_contact_name) || undefined,
    tsd_contact_email: clean(intake.extracted_tsd_contact_email) || undefined,
    agent_count: clean(intake.extracted_agent_count) || undefined,
    implementation_timeline: clean(intake.extracted_implementation_timeline) || undefined,
    solutions_interested: intake.extracted_solutions_interested || undefined,
    opportunity_description: clean(intake.extracted_opportunity_description) || undefined,
    has_conflicts: intake.has_conflicts ?? undefined,
    conflicts: intake.conflicts || undefined,
    email_body_plain: intake.email_body_plain || undefined,
    original_data: intake,
  }
}

function formSubmissionToUnified(reg: DealRegistration): UnifiedDeal {
  const deal: Partial<UnifiedDeal> = {
    customer_first_name: clean(reg.customer_first_name),
    customer_last_name: clean(reg.customer_last_name),
    customer_company_name: clean(reg.customer_company_name),
    customer_email: clean(reg.customer_email),
    ta_full_name: clean(reg.ta_full_name),
    ta_email: clean(reg.ta_email),
    ta_company_name: clean(reg.ta_company_name),
    tsd_name: clean(reg.tsd_name),
    solutions_interested: reg.solutions_interested || [],
  }
  const missingFields = getMissingFields(deal)
  let status = mapFormStatus(reg)
  if (missingFields.length === 0 && status === 'inbox') {
    status = 'ready'
  }
  return {
    id: reg.id,
    type: 'form_submission',
    status,
    created_at: reg.created_at,
    updated_at: reg.updated_at || reg.created_at,
    source_label: 'Form',
    customer_company_name: clean(reg.customer_company_name),
    customer_first_name: clean(reg.customer_first_name),
    customer_last_name: clean(reg.customer_last_name),
    customer_email: clean(reg.customer_email),
    customer_phone: clean(reg.customer_phone) || undefined,
    customer_job_title: clean(reg.customer_job_title) || undefined,
    ta_full_name: clean(reg.ta_full_name),
    ta_company_name: clean(reg.ta_company_name),
    ta_email: clean(reg.ta_email),
    ta_phone: clean(reg.ta_phone) || undefined,
    tsd_name: clean(reg.tsd_name),
    tsd_contact_name: clean(reg.tsd_contact_name) || undefined,
    tsd_contact_email: clean(reg.tsd_contact_email) || undefined,
    agent_count: clean(reg.agent_count) || undefined,
    implementation_timeline: clean(reg.implementation_timeline) || undefined,
    solutions_interested: reg.solutions_interested || undefined,
    opportunity_description: clean(reg.opportunity_description) || undefined,
    rejection_reason: clean(reg.rejection_reason) || undefined,
    original_data: reg,
  }
}

// Light mode color palette
const colors = {
  bg: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  text: '#1e293b',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
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

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = useMemo(() => createClientComponentClient(), [])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [deals, setDeals] = useState<UnifiedDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'inbox' | 'archive'>('inbox')
  const [selectedDeal, setSelectedDeal] = useState<UnifiedDeal | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<UnifiedDeal>>({})
  const [saving, setSaving] = useState(false)
  const [sendingToHubSpot, setSendingToHubSpot] = useState(false)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectPath, setRejectPath] = useState<'choose' | 'custom'>('choose')
  const [rejectCopied, setRejectCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login?redirect=/admin'); return }
      const { data: profileData, error } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
      // If no profile or not admin, redirect to partner dashboard (which can auto-create profile if needed)
      if (error || !profileData || profileData.role !== 'admin') {
        console.log('Not admin or no profile, redirecting to partner dashboard')
        router.push('/partner/dashboard')
        return
      }
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
    return deals.filter(d => d.status === 'inbox' || d.status === 'pending_info' || d.status === 'ready')
  }, [deals, activeTab])

  const stats = useMemo(() => {
    const active = deals.filter(d => d.status === 'inbox' || d.status === 'pending_info' || d.status === 'ready')
    return {
      inbox: active.length,
      ready: active.filter(d => d.status === 'ready').length,
      needsInfo: active.filter(d => d.status !== 'ready').length,
      archive: deals.filter(d => d.status === 'completed' || d.status === 'rejected').length,
    }
  }, [deals])

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

  const handleUnreject = async () => {
    if (!selectedDeal) return
    if (selectedDeal.type === 'email_intake') {
      await supabase.from('email_intakes').update({ status: 'new' }).eq('id', selectedDeal.id)
    } else {
      await fetch(`/api/registrations/${selectedDeal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unreject' }) })
    }
    await fetchData()
    setSelectedDeal(null)
    setActiveTab('inbox')
  }

  const handleDelete = async () => {
    if (!selectedDeal) return
    setDeleting(true)
    try {
      const table = selectedDeal.type === 'email_intake' ? 'email_intakes' : 'deal_registrations'
      const result = await supabase.from(table).delete().eq('id', selectedDeal.id).select()
      if (result.error) {
        console.error('Delete error:', result.error)
        alert('Failed to delete: ' + result.error.message)
        return
      }
      if (!result.data || result.data.length === 0) {
        alert('Delete failed — the record may be protected by a database policy. Check the browser console for details.')
        console.error('Delete returned no rows. Table:', table, 'ID:', selectedDeal.id, 'Type:', selectedDeal.type)
        return
      }
      setSelectedDeal(null)
      setShowDeleteConfirm(false)
      await fetchData()
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete the record.')
    } finally {
      setDeleting(false)
    }
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

  const handleCreateNew = async () => {
    setCreating(true)
    try {
      const { data, error } = await supabase.from('email_intakes').insert({
        status: 'pending',
        email_subject: 'Manually Created',
      }).select().single()
      if (error || !data) {
        console.error('Create error:', error)
        alert('Failed to create new deal.')
        return
      }
      await fetchData()
      const unified = emailIntakeToUnified(data)
      setActiveTab('inbox')
      setSelectedDeal(unified)
      setEditMode(true)
      setEditData({ ...unified })
    } catch (err) {
      console.error('Create error:', err)
      alert('Failed to create new deal.')
    } finally {
      setCreating(false)
    }
  }

  if (isAuthChecking || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${colors.primary}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  const missingFields = selectedDeal ? getMissingFields(editMode ? editData as UnifiedDeal : selectedDeal) : []
  const canSend = missingFields.length === 0 && !selectedDeal?.has_conflicts

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      {/* Header */}
      <header style={{ backgroundColor: colors.white, borderBottom: `1px solid ${colors.border}`, padding: '16px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <img src="/Amp Logo.png" alt="AmplifAI" style={{ height: 32 }} />
            <span style={{ fontSize: 14, color: colors.textMuted }}>Deal Registrations</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.origin); alert('Form link copied!') }}
                style={{ padding: '6px 12px', fontSize: 12, backgroundColor: colors.white, color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy Form Link
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText('channel.dkj2hu@zapiermail.com'); alert('Forwarding email copied!') }}
                style={{ padding: '6px 12px', fontSize: 12, backgroundColor: colors.white, color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Copy Forwarding Email
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.origin + '/partner/dashboard'); alert('Partner portal link copied!') }}
                style={{ padding: '6px 12px', fontSize: 12, backgroundColor: colors.white, color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Copy Partner Portal Link
              </button>
              <button
                onClick={handleCreateNew}
                disabled={creating}
                style={{ padding: '6px 12px', fontSize: 12, backgroundColor: colors.primary, color: colors.white, border: 'none', borderRadius: 4, cursor: creating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: creating ? 0.7 : 1 }}
              >
                <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                {creating ? 'Creating...' : 'Create New'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14, color: colors.textMuted }}>{profile?.full_name}</span>
            <Link href="/admin/users" style={{ padding: '8px 16px', fontSize: 14, backgroundColor: colors.white, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, textDecoration: 'none' }}>
              Manage Users
            </Link>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} style={{ padding: '8px 16px', fontSize: 14, backgroundColor: colors.white, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
          {[
            { id: 'inbox', label: 'Inbox', count: stats.inbox },
            { id: 'archive', label: 'Archive', count: stats.archive },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                backgroundColor: activeTab === tab.id ? colors.text : colors.white,
                color: activeTab === tab.id ? colors.white : colors.textMuted,
                border: activeTab === tab.id ? 'none' : `1px solid ${colors.border}`,
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.15)' : colors.bg,
                  color: activeTab === tab.id ? colors.white : colors.textMuted,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
          {activeTab === 'inbox' && stats.inbox > 0 && (
            <span style={{ fontSize: 13, color: colors.textMuted, marginLeft: 8 }}>
              {stats.ready} ready / {stats.needsInfo} needs info
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          {/* Deal List */}
          <div style={{ width: selectedDeal ? '40%' : '100%', transition: 'width 0.2s' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                      padding: 16,
                      borderRadius: 8,
                      backgroundColor: isSelected ? colors.bg : colors.white,
                      border: isSelected ? `1px solid ${colors.text}` : `1px solid ${colors.border}`,
                      borderLeft: isSelected ? `2px solid ${colors.text}` : `3px solid ${
                        deal.status === 'ready' ? colors.success
                        : deal.has_conflicts ? colors.error
                        : colors.border
                      }`,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <h3 style={{ fontWeight: 600, color: colors.text, margin: 0, fontSize: 15 }}>
                          {deal.customer_company_name || 'Unknown Company'}
                        </h3>
                        <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 0' }}>
                          {deal.customer_first_name} {deal.customer_last_name}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 12, color: colors.textMuted, margin: 0 }}>{formatDate(deal.created_at)}</p>
                        <p style={{ fontSize: 12, color: colors.textLight, margin: '2px 0 0' }}>{formatTime(deal.created_at)}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Status indicator */}
                      {deal.status === 'ready' && (
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, backgroundColor: colors.successLight, color: colors.successText }}>
                          Ready
                        </span>
                      )}
                      {deal.has_conflicts && deal.status !== 'completed' && deal.status !== 'rejected' && (
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, backgroundColor: colors.errorLight, color: colors.errorText }}>
                          Conflicts
                        </span>
                      )}
                      {missing.length > 0 && deal.status !== 'completed' && deal.status !== 'rejected' && (
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, backgroundColor: colors.warningLight, color: colors.warningText }}>
                          Missing {missing.length} field{missing.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {deal.status === 'completed' && (
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, backgroundColor: colors.successLight, color: colors.successText }}>Sent</span>
                      )}
                      {deal.status === 'rejected' && (
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, backgroundColor: colors.errorLight, color: colors.errorText }}>Rejected</span>
                      )}
                      {/* Context — plain text, no colored badges */}
                      <span style={{ fontSize: 11, color: colors.textLight }}>
                        {deal.source_label}{deal.ta_company_name ? ` · ${deal.ta_company_name}` : ''}{deal.tsd_name ? ` · ${deal.tsd_name}` : ''}
                      </span>
                    </div>
                  </button>
                )
              })}

              {filteredDeals.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: colors.textMuted, backgroundColor: colors.white, borderRadius: 8, border: `1px solid ${colors.border}` }}>
                  No deals in {activeTab === 'archive' ? 'archive' : 'inbox'}
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedDeal && (
            <div style={{ width: '60%', backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
              {/* Panel Header */}
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg }}>
                <div>
                  <h2 style={{ fontWeight: 600, margin: 0, fontSize: 18, color: colors.text }}>{selectedDeal.customer_company_name || 'Unknown Company'}</h2>
                  <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 0' }}>
                    {selectedDeal.source_label} • {formatDate(selectedDeal.created_at)} at {formatTime(selectedDeal.created_at)}
                  </p>
                </div>
                <button onClick={() => { setSelectedDeal(null); setEditMode(false) }} style={{ padding: 8, cursor: 'pointer', background: 'none', border: 'none', borderRadius: 6 }}>
                  <svg style={{ width: 20, height: 20, color: colors.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div style={{ padding: 24, maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                {/* Alerts */}
                {missingFields.length > 0 && selectedDeal.status !== 'completed' && selectedDeal.status !== 'rejected' && (
                  <div style={{ padding: 12, backgroundColor: colors.warningLight, border: `1px solid ${colors.warning}`, borderRadius: 8, marginBottom: 20 }}>
                    <p style={{ margin: 0, fontSize: 13, color: colors.warningText }}>
                      <strong>Missing required fields:</strong> {missingFields.join(', ')}
                    </p>
                  </div>
                )}

                {selectedDeal.has_conflicts && selectedDeal.conflicts && (
                  <div style={{ padding: 16, backgroundColor: colors.errorLight, border: `1px solid ${colors.error}`, borderRadius: 8, marginBottom: 20 }}>
                    <p style={{ fontWeight: 600, color: colors.errorText, marginBottom: 12, fontSize: 14 }}>Resolve conflicts before sending:</p>
                    {selectedDeal.conflicts.map((c, i) => (
                      <div key={i} style={{ padding: 12, backgroundColor: colors.white, borderRadius: 6, marginBottom: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>{c.field.replace(/_/g, ' ')}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <button onClick={() => handleResolveConflict(i, false)} style={{ padding: 10, fontSize: 13, textAlign: 'left', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer' }}>
                            <span style={{ display: 'block', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Your value:</span>
                            <span style={{ color: colors.text }}>{String(c.admin_value || '-')}</span>
                          </button>
                          <button onClick={() => handleResolveConflict(i, true)} style={{ padding: 10, fontSize: 13, textAlign: 'left', backgroundColor: colors.primaryLight, border: `1px solid ${colors.primary}`, borderRadius: 6, cursor: 'pointer' }}>
                            <span style={{ display: 'block', fontSize: 11, color: colors.primaryText, marginBottom: 4 }}>Partner value:</span>
                            <span style={{ color: colors.text }}>{String(c.partner_value || '-')}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Original Email */}
                {selectedDeal.email_body_plain && (
                  <details style={{ marginBottom: 24 }}>
                    <summary style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, cursor: 'pointer', padding: '8px 0' }}>View Original Email</summary>
                    <div style={{ marginTop: 8, padding: 12, backgroundColor: colors.bg, borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto', color: colors.text, border: `1px solid ${colors.border}` }}>
                      {selectedDeal.email_body_plain}
                    </div>
                  </details>
                )}

                {/* Main Grid Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  {/* Customer Section */}
                  <div style={{ gridColumn: '1 / 2', border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</h3>
                    </div>
                    <div style={{ padding: 16 }}>
                      <GridField label="Company" value={editMode ? editData.customer_company_name : selectedDeal.customer_company_name} onChange={v => setEditData(p => ({ ...p, customer_company_name: v }))} editMode={editMode} required />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <GridField label="First Name" value={editMode ? editData.customer_first_name : selectedDeal.customer_first_name} onChange={v => setEditData(p => ({ ...p, customer_first_name: v }))} editMode={editMode} required />
                        <GridField label="Last Name" value={editMode ? editData.customer_last_name : selectedDeal.customer_last_name} onChange={v => setEditData(p => ({ ...p, customer_last_name: v }))} editMode={editMode} required />
                      </div>
                      <GridField label="Email" value={editMode ? editData.customer_email : selectedDeal.customer_email} onChange={v => setEditData(p => ({ ...p, customer_email: v }))} editMode={editMode} required />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <GridField label="Phone" value={editMode ? editData.customer_phone : selectedDeal.customer_phone} onChange={v => setEditData(p => ({ ...p, customer_phone: v }))} editMode={editMode} />
                        <GridField label="Job Title" value={editMode ? editData.customer_job_title : selectedDeal.customer_job_title} onChange={v => setEditData(p => ({ ...p, customer_job_title: v }))} editMode={editMode} />
                      </div>
                    </div>
                  </div>

                  {/* Partner Section */}
                  <div style={{ gridColumn: '2 / 3', border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trusted Advisor (TA)</h3>
                    </div>
                    <div style={{ padding: 16 }}>
                      <GridField label="Name" value={editMode ? editData.ta_full_name : selectedDeal.ta_full_name} onChange={v => setEditData(p => ({ ...p, ta_full_name: v }))} editMode={editMode} required />
                      <GridField label="Company" value={editMode ? editData.ta_company_name : selectedDeal.ta_company_name} onChange={v => setEditData(p => ({ ...p, ta_company_name: v }))} editMode={editMode} required />
                      <GridField label="Email" value={editMode ? editData.ta_email : selectedDeal.ta_email} onChange={v => setEditData(p => ({ ...p, ta_email: v }))} editMode={editMode} required />
                      <GridField label="Phone" value={editMode ? editData.ta_phone : selectedDeal.ta_phone} onChange={v => setEditData(p => ({ ...p, ta_phone: v }))} editMode={editMode} />
                    </div>
                  </div>

                  {/* TSD Section */}
                  <div style={{ gridColumn: '1 / 3', border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TSD</h3>
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        {editMode ? (
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                              TSD <span style={{ color: colors.error }}>*</span>
                            </label>
                            <select
                              value={editData.tsd_name || ''}
                              onChange={e => setEditData(p => ({ ...p, tsd_name: e.target.value }))}
                              style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white }}
                            >
                              <option value="">Select TSD...</option>
                              {TSD_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        ) : (
                          <GridField label="TSD" value={selectedDeal.tsd_name} onChange={() => {}} editMode={false} required />
                        )}
                        <GridField label="Contact Name" value={editMode ? editData.tsd_contact_name : selectedDeal.tsd_contact_name} onChange={v => setEditData(p => ({ ...p, tsd_contact_name: v }))} editMode={editMode} />
                        <GridField label="Contact Email" value={editMode ? editData.tsd_contact_email : selectedDeal.tsd_contact_email} onChange={v => setEditData(p => ({ ...p, tsd_contact_email: v }))} editMode={editMode} />
                      </div>
                    </div>
                  </div>

                  {/* Opportunity Section */}
                  <div style={{ gridColumn: '1 / 3', border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Opportunity</h3>
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        {editMode ? (
                          <>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>Agents</label>
                              <select
                                value={editData.agent_count || ''}
                                onChange={e => setEditData(p => ({ ...p, agent_count: e.target.value }))}
                                style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white }}
                              >
                                <option value="">Select...</option>
                                {AGENT_COUNT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>Timeline</label>
                              <select
                                value={editData.implementation_timeline || ''}
                                onChange={e => setEditData(p => ({ ...p, implementation_timeline: e.target.value }))}
                                style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white }}
                              >
                                <option value="">Select...</option>
                                {TIMELINE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          </>
                        ) : (
                          <>
                            <GridField label="Agents" value={selectedDeal.agent_count} onChange={() => {}} editMode={false} />
                            <GridField label="Timeline" value={selectedDeal.implementation_timeline} onChange={() => {}} editMode={false} />
                          </>
                        )}
                      </div>

                      {/* Solutions - Now Required */}
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
                          Solutions <span style={{ color: colors.error }}>*</span>
                        </label>
                        {editMode ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: 13,
                                    backgroundColor: selected ? colors.primary : colors.white,
                                    color: selected ? colors.white : colors.text,
                                    border: `1px solid ${selected ? colors.primary : colors.border}`,
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {s}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                            padding: (selectedDeal.solutions_interested || []).length === 0 ? '10px 12px' : 0,
                            backgroundColor: (selectedDeal.solutions_interested || []).length === 0 ? colors.errorLight : 'transparent',
                            border: (selectedDeal.solutions_interested || []).length === 0 ? `1px solid ${colors.error}` : 'none',
                            borderRadius: 6,
                          }}>
                            {(selectedDeal.solutions_interested || []).length > 0 ?
                              selectedDeal.solutions_interested!.map(s => (
                                <span key={s} style={{ padding: '4px 10px', backgroundColor: colors.bg, color: colors.text, borderRadius: 4, fontSize: 13, fontWeight: 500, border: `1px solid ${colors.border}` }}>{s}</span>
                              )) :
                              <span style={{ color: colors.errorText, fontSize: 14, fontWeight: 500 }}>No solutions selected - required</span>
                            }
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {editMode ? (
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>Notes</label>
                          <textarea
                            value={editData.opportunity_description || ''}
                            onChange={e => setEditData(p => ({ ...p, opportunity_description: e.target.value }))}
                            rows={3}
                            style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, resize: 'vertical' }}
                          />
                        </div>
                      ) : selectedDeal.opportunity_description && (
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>Notes</label>
                          <p style={{ fontSize: 14, color: colors.text, margin: 0, lineHeight: 1.5 }}>{selectedDeal.opportunity_description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ padding: '16px 24px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
                {editMode ? (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: colors.white, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: colors.primary, color: colors.white, border: 'none', borderRadius: 6, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Changes'}</button>
                  </div>
                ) : selectedDeal.status === 'completed' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, margin: 0 }}>
                      Sent to HubSpot
                    </p>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={handleSendToHubSpot}
                        disabled={sendingToHubSpot}
                        style={{
                          flex: 1,
                          padding: '10px 20px',
                          fontSize: 14,
                          fontWeight: 500,
                          backgroundColor: colors.white,
                          color: colors.textMuted,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 6,
                          cursor: sendingToHubSpot ? 'not-allowed' : 'pointer',
                          opacity: sendingToHubSpot ? 0.7 : 1,
                        }}
                      >
                        {sendingToHubSpot ? 'Resubmitting...' : 'Resubmit to HubSpot'}
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText('') }}
                        style={{
                          flex: 1,
                          padding: '10px 20px',
                          fontSize: 14,
                          fontWeight: 500,
                          backgroundColor: colors.error,
                          color: colors.white,
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                        }}
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                ) : selectedDeal.status === 'rejected' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: 14, margin: 0 }}>
                      This deal was rejected
                    </p>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={handleUnreject}
                        style={{
                          flex: 1,
                          padding: '10px 20px',
                          fontSize: 14,
                          fontWeight: 500,
                          backgroundColor: colors.white,
                          color: colors.textMuted,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        Unreject
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText('') }}
                        style={{
                          flex: 1,
                          padding: '10px 20px',
                          fontSize: 14,
                          fontWeight: 500,
                          backgroundColor: colors.error,
                          color: colors.white,
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                      onClick={() => setShowApproveConfirm(true)}
                      disabled={!canSend || sendingToHubSpot}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        fontSize: 14,
                        fontWeight: 600,
                        backgroundColor: canSend ? colors.success : '#d1d5db',
                        color: colors.white,
                        border: 'none',
                        borderRadius: 6,
                        cursor: canSend ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {sendingToHubSpot ? 'Sending...' : canSend ? 'Approve & Send to HubSpot' : 'Complete required fields to send'}
                    </button>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => { setEditMode(true); setEditData({ ...selectedDeal }) }} style={{ flex: 1, padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: colors.white, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer' }}>Edit</button>
                      {selectedDeal.type === 'email_intake' && (
                        <button onClick={handleRequestInfo} style={{ flex: 1, padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: colors.white, color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer' }}>Request Info</button>
                      )}
                      <button onClick={() => { setShowRejectModal(true); setRejectPath('choose'); setRejectCopied(false) }} style={{ padding: '10px 20px', fontSize: 14, fontWeight: 500, backgroundColor: colors.white, color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer' }}>Reject</button>
                      <button onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText('') }} title="Delete" style={{ padding: '10px 12px', fontSize: 14, backgroundColor: colors.white, color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approve & Send Confirmation Modal */}
      {showApproveConfirm && selectedDeal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowApproveConfirm(false)}
        >
          <div
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: colors.text }}>
              Approve & Send to HubSpot
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: colors.textMuted }}>
              Are you sure you want to approve this deal and send it to HubSpot?
            </p>
            <div style={{ padding: 12, backgroundColor: colors.bg, borderRadius: 8, marginBottom: 20, border: `1px solid ${colors.border}` }}>
              <p style={{ margin: 0, fontSize: 13, color: colors.text }}>
                <strong>{selectedDeal.customer_first_name} {selectedDeal.customer_last_name}</strong> at {selectedDeal.customer_company_name}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.textMuted }}>
                TA: {selectedDeal.ta_full_name} ({selectedDeal.ta_company_name})
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowApproveConfirm(false)}
                style={{
                  flex: 1,
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
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowApproveConfirm(false)
                  await handleSendToHubSpot()
                }}
                disabled={sendingToHubSpot}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: colors.success,
                  color: colors.white,
                  border: 'none',
                  borderRadius: 6,
                  cursor: sendingToHubSpot ? 'not-allowed' : 'pointer',
                  opacity: sendingToHubSpot ? 0.7 : 1,
                }}
              >
                {sendingToHubSpot ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedDeal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowRejectModal(false)}
        >
          <div
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {rejectPath === 'choose' ? (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: colors.text }}>
                  Reject Deal
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: 14, color: colors.textMuted }}>
                  How would you like to handle this rejection?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    onClick={async () => {
                      setShowRejectModal(false)
                      await handleReject()
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      fontSize: 14,
                      fontWeight: 500,
                      backgroundColor: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'block', fontWeight: 600, marginBottom: 2 }}>Junk / Spam</span>
                    <span style={{ fontSize: 13, color: colors.textMuted }}>Reject and archive immediately</span>
                  </button>
                  <button
                    onClick={() => setRejectPath('custom')}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      fontSize: 14,
                      fontWeight: 500,
                      backgroundColor: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'block', fontWeight: 600, marginBottom: 2 }}>Send Rejection Notice</span>
                    <span style={{ fontSize: 13, color: colors.textMuted }}>Copy a rejection email to send to the partner</span>
                  </button>
                </div>
                <button
                  onClick={() => setShowRejectModal(false)}
                  style={{
                    width: '100%',
                    marginTop: 12,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 500,
                    backgroundColor: colors.white,
                    color: colors.textMuted,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: colors.text }}>
                  Rejection Notice
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: 14, color: colors.textMuted }}>
                  Copy this message and send it to the partner.
                </p>
                <div
                  style={{
                    padding: 16,
                    backgroundColor: colors.bg,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    marginBottom: 16,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: colors.text,
                    whiteSpace: 'pre-wrap',
                  }}
                >
{`Hi ${(selectedDeal.ta_full_name || 'there').split(' ')[0]},

Thanks for submitting a deal registration for ${selectedDeal.customer_company_name || 'the customer'}. We took a look and unfortunately aren't able to move forward with this one.

If you think this was a mistake or have any questions, feel free to reply and we're happy to take another look.

Best,
${profile?.full_name || 'AmplifAI Channel Team'}`}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={async () => {
                      const text = `Hi ${(selectedDeal.ta_full_name || 'there').split(' ')[0]},\n\nThanks for submitting a deal registration for ${selectedDeal.customer_company_name || 'the customer'}. We took a look and unfortunately aren't able to move forward with this one.\n\nIf you think this was a mistake or have any questions, feel free to reply and we're happy to take another look.\n\nBest,\n${profile?.full_name || 'AmplifAI Channel Team'}`
                      await navigator.clipboard.writeText(text)
                      setRejectCopied(true)
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 500,
                      backgroundColor: rejectCopied ? colors.successLight : colors.white,
                      color: rejectCopied ? colors.successText : colors.text,
                      border: `1px solid ${rejectCopied ? colors.success : colors.border}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    {rejectCopied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                  <button
                    onClick={async () => {
                      setShowRejectModal(false)
                      await handleReject()
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 600,
                      backgroundColor: colors.error,
                      color: colors.white,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Reject & Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal — type "delete" to confirm */}
      {showDeleteConfirm && selectedDeal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: colors.error }}>
              Delete Permanently
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: colors.textMuted }}>
              This will permanently delete this deal registration. This action cannot be undone.
            </p>
            <div style={{ padding: 12, backgroundColor: colors.errorLight, borderRadius: 8, marginBottom: 16, border: `1px solid ${colors.error}` }}>
              <p style={{ margin: 0, fontSize: 13, color: colors.text }}>
                <strong>{selectedDeal.customer_first_name} {selectedDeal.customer_last_name}</strong> at {selectedDeal.customer_company_name}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.textMuted }}>
                TA: {selectedDeal.ta_full_name} ({selectedDeal.ta_company_name})
              </p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, color: colors.text, marginBottom: 8 }}>
                Type <strong>delete</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="delete"
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 14,
                  border: `1px solid ${deleteConfirmText.toLowerCase() === 'delete' ? colors.error : colors.border}`,
                  borderRadius: 6,
                  backgroundColor: colors.white,
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
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
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText.toLowerCase() !== 'delete'}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: deleteConfirmText.toLowerCase() === 'delete' ? colors.error : '#d1d5db',
                  color: colors.white,
                  border: 'none',
                  borderRadius: 6,
                  cursor: (deleting || deleteConfirmText.toLowerCase() !== 'delete') ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GridField({ label, value, onChange, editMode, required }: { label: string; value: string | undefined; onChange: (v: string) => void; editMode: boolean; required?: boolean }) {
  const normalized = (!value || value === 'null' || value === 'undefined') ? '' : value
  const empty = !normalized || normalized.trim() === ''
  const colors = {
    text: '#1e293b',
    textMuted: '#64748b',
    border: '#e2e8f0',
    error: '#dc2626',
    white: '#ffffff',
  }

  if (editMode) {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
          {label}{required && <span style={{ color: colors.error }}> *</span>}
        </label>
        <input
          type="text"
          value={normalized}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: 14,
            border: `1px solid ${required && empty ? colors.error : colors.border}`,
            borderRadius: 6,
            backgroundColor: colors.white
          }}
        />
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>{label}</label>
      <p style={{ fontSize: 14, color: empty ? colors.textMuted : colors.text, margin: 0 }}>{normalized || '-'}</p>
    </div>
  )
}
