'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient, type UserProfile, type EmailIntake, type DealRegistration } from '@/lib/supabase'
import Link from 'next/link'

// Unified item type that can represent both email intakes and form submissions
type UnifiedDeal = {
  id: string
  type: 'email_intake' | 'form_submission'
  status: 'inbox' | 'pending_info' | 'ready' | 'completed' | 'rejected'
  created_at: string
  updated_at: string
  // Source info
  source_label: string
  email_subject?: string
  email_from?: string
  // Customer info
  customer_company_name: string
  customer_first_name: string
  customer_last_name: string
  customer_email: string
  customer_phone?: string
  customer_job_title?: string
  customer_street_address?: string
  customer_city?: string
  customer_state?: string
  customer_postal_code?: string
  customer_country?: string
  // Partner/TA info
  ta_full_name: string
  ta_company_name: string
  ta_email: string
  ta_phone?: string
  // TSD info
  tsd_name: string
  tsd_contact_name?: string
  tsd_contact_email?: string
  // Opportunity info
  agent_count?: string
  implementation_timeline?: string
  solutions_interested?: string[]
  opportunity_description?: string
  // Email-specific
  has_conflicts?: boolean
  conflicts?: Array<{ field: string; admin_value: unknown; partner_value: unknown }>
  confidence_scores?: Record<string, number>
  email_body_plain?: string
  // Form-specific
  rejection_reason?: string
  // Original data reference
  original_data: EmailIntake | DealRegistration
}

// Status configuration
const STATUS_CONFIG = {
  inbox: {
    label: 'Inbox',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    description: 'New submissions to review'
  },
  pending_info: {
    label: 'Pending Info',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    description: 'Waiting for partner response'
  },
  ready: {
    label: 'Ready',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    description: 'Complete, ready to send'
  },
  completed: {
    label: 'Completed',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    description: 'Sent to HubSpot'
  },
  rejected: {
    label: 'Rejected',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    description: 'Not pursuing'
  },
}

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

const REQUIRED_FIELDS = [
  { key: 'customer_first_name', label: 'Customer First Name' },
  { key: 'customer_last_name', label: 'Customer Last Name' },
  { key: 'customer_company_name', label: 'Customer Company' },
  { key: 'customer_email', label: 'Customer Email' },
  { key: 'ta_full_name', label: 'TA Name' },
  { key: 'ta_email', label: 'TA Email' },
  { key: 'ta_company_name', label: 'TA Company' },
  { key: 'tsd_name', label: 'TSD Name' },
]

const ZAPIER_WEBHOOK_URL = process.env.NEXT_PUBLIC_ZAPIER_WEBHOOK_URL || ''

function getMissingRequiredFields(deal: Partial<UnifiedDeal>): string[] {
  return REQUIRED_FIELDS
    .filter(field => !deal[field.key as keyof UnifiedDeal])
    .map(field => field.label)
}

// Map email intake status to unified status
function mapEmailIntakeStatus(intake: EmailIntake): UnifiedDeal['status'] {
  if (intake.status === 'converted') return 'completed'
  if (intake.status === 'discarded') return 'rejected'
  if (intake.status === 'reviewed') return 'pending_info'
  return 'inbox'
}

// Map form submission status to unified status
function mapFormStatus(reg: DealRegistration): UnifiedDeal['status'] {
  if (reg.status === 'approved') return 'completed'
  if (reg.status === 'rejected') return 'rejected'
  return 'inbox'
}

// Convert email intake to unified deal
function emailIntakeToUnified(intake: EmailIntake): UnifiedDeal {
  const missingFields = getMissingRequiredFields({
    customer_first_name: intake.extracted_customer_first_name || '',
    customer_last_name: intake.extracted_customer_last_name || '',
    customer_company_name: intake.extracted_customer_company_name || '',
    customer_email: intake.extracted_customer_email || '',
    ta_full_name: intake.extracted_ta_full_name || '',
    ta_email: intake.extracted_ta_email || '',
    ta_company_name: intake.extracted_ta_company_name || '',
    tsd_name: intake.extracted_tsd_name || '',
  } as Partial<UnifiedDeal>)

  let status = mapEmailIntakeStatus(intake)
  // If all required fields are filled and status is inbox/pending_info, mark as ready
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
    customer_street_address: intake.extracted_customer_street_address || undefined,
    customer_city: intake.extracted_customer_city || undefined,
    customer_state: intake.extracted_customer_state || undefined,
    customer_postal_code: intake.extracted_customer_postal_code || undefined,
    customer_country: intake.extracted_customer_country || undefined,
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
    confidence_scores: intake.confidence_scores as Record<string, number> | undefined,
    email_body_plain: intake.email_body_plain || undefined,
    original_data: intake,
  }
}

// Convert form submission to unified deal
function formSubmissionToUnified(reg: DealRegistration): UnifiedDeal {
  return {
    id: reg.id,
    type: 'form_submission',
    status: mapFormStatus(reg),
    created_at: reg.created_at,
    updated_at: reg.updated_at || reg.created_at,
    source_label: reg.source === 'email_import' ? 'Email Form' : 'Direct Form',
    customer_company_name: reg.customer_company_name || '',
    customer_first_name: reg.customer_first_name || '',
    customer_last_name: reg.customer_last_name || '',
    customer_email: reg.customer_email || '',
    customer_phone: reg.customer_phone || undefined,
    customer_job_title: reg.customer_job_title || undefined,
    customer_street_address: reg.customer_street_address || undefined,
    customer_city: reg.customer_city || undefined,
    customer_state: reg.customer_state || undefined,
    customer_postal_code: reg.customer_postal_code || undefined,
    customer_country: reg.customer_country || undefined,
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

export default function UnifiedAdminDashboard() {
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
  const [showSendToPartnerModal, setShowSendToPartnerModal] = useState(false)
  const [partnerEmail, setPartnerEmail] = useState('')
  const [sendingToPartner, setSendingToPartner] = useState(false)

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirect=/admin')
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
    }

    checkAuth()
  }, [router, supabase])

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      // Fetch both email intakes and form registrations in parallel
      const [intakesResult, registrationsResult] = await Promise.all([
        supabase
          .from('email_intakes')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('deal_registrations')
          .select('*')
          .order('created_at', { ascending: false }),
      ])

      const intakes = intakesResult.data || []
      const registrations = registrationsResult.data || []

      // Convert to unified format
      const unifiedIntakes = intakes.map(emailIntakeToUnified)
      const unifiedRegistrations = registrations.map(formSubmissionToUnified)

      // Combine and sort by date
      const allDeals = [...unifiedIntakes, ...unifiedRegistrations]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setDeals(allDeals)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (!isAuthChecking) {
      fetchData()
    }
  }, [isAuthChecking, fetchData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Filter deals by tab
  const filteredDeals = useMemo(() => {
    if (activeTab === 'archive') {
      return deals.filter(d => d.status === 'completed' || d.status === 'rejected')
    }
    return deals.filter(d => d.status === activeTab)
  }, [deals, activeTab])

  // Stats
  const stats = useMemo(() => ({
    inbox: deals.filter(d => d.status === 'inbox').length,
    pending_info: deals.filter(d => d.status === 'pending_info').length,
    ready: deals.filter(d => d.status === 'ready').length,
    archive: deals.filter(d => d.status === 'completed' || d.status === 'rejected').length,
  }), [deals])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const handleEdit = () => {
    if (selectedDeal) {
      setEditData({ ...selectedDeal })
      setEditMode(true)
    }
  }

  const handleFieldChange = (field: string, value: string | string[]) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!selectedDeal) return
    setSaving(true)

    try {
      if (selectedDeal.type === 'email_intake') {
        // Update email intake
        await supabase
          .from('email_intakes')
          .update({
            extracted_customer_first_name: editData.customer_first_name,
            extracted_customer_last_name: editData.customer_last_name,
            extracted_customer_company_name: editData.customer_company_name,
            extracted_customer_email: editData.customer_email,
            extracted_customer_phone: editData.customer_phone,
            extracted_customer_job_title: editData.customer_job_title,
            extracted_customer_street_address: editData.customer_street_address,
            extracted_customer_city: editData.customer_city,
            extracted_customer_state: editData.customer_state,
            extracted_customer_postal_code: editData.customer_postal_code,
            extracted_customer_country: editData.customer_country,
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
            status: 'reviewed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedDeal.id)
      } else {
        // Update form registration
        await fetch(`/api/registrations/${selectedDeal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            customer_first_name: editData.customer_first_name,
            customer_last_name: editData.customer_last_name,
            customer_company_name: editData.customer_company_name,
            customer_email: editData.customer_email,
            customer_phone: editData.customer_phone,
            customer_job_title: editData.customer_job_title,
            customer_street_address: editData.customer_street_address,
            customer_city: editData.customer_city,
            customer_state: editData.customer_state,
            customer_postal_code: editData.customer_postal_code,
            customer_country: editData.customer_country,
            ta_full_name: editData.ta_full_name,
            ta_company_name: editData.ta_company_name,
            ta_email: editData.ta_email,
            ta_phone: editData.ta_phone,
            tsd_name: editData.tsd_name,
            tsd_contact_name: editData.tsd_contact_name,
            tsd_contact_email: editData.tsd_contact_email,
            agent_count: editData.agent_count,
            implementation_timeline: editData.implementation_timeline,
            solutions_interested: editData.solutions_interested,
            opportunity_description: editData.opportunity_description,
          }),
        })
      }

      await fetchData()
      setEditMode(false)
      setSelectedDeal(null)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleSendToHubSpot = async () => {
    if (!selectedDeal) return
    if (!ZAPIER_WEBHOOK_URL) {
      alert('Zapier webhook URL not configured.')
      return
    }
    setSendingToHubSpot(true)

    try {
      const data = editMode ? editData : selectedDeal
      const payload = {
        ta_full_name: data.ta_full_name,
        ta_email: data.ta_email,
        ta_phone: data.ta_phone,
        ta_company_name: data.ta_company_name,
        tsd_name: data.tsd_name,
        tsd_contact_name: data.tsd_contact_name,
        tsd_contact_email: data.tsd_contact_email,
        customer_first_name: data.customer_first_name,
        customer_last_name: data.customer_last_name,
        customer_company_name: data.customer_company_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        customer_job_title: data.customer_job_title,
        agent_count: data.agent_count,
        implementation_timeline: data.implementation_timeline,
        opportunity_description: data.opportunity_description,
        source: selectedDeal.type,
        submitted_at: new Date().toISOString(),
      }

      await fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify(payload),
      })

      // Update status to completed
      if (selectedDeal.type === 'email_intake') {
        await supabase
          .from('email_intakes')
          .update({
            status: 'converted',
            converted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedDeal.id)
      } else {
        await fetch(`/api/registrations/${selectedDeal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        })
      }

      alert('Successfully sent to HubSpot!')
      await fetchData()
      setSelectedDeal(null)
      setEditMode(false)
    } catch (err) {
      console.error('HubSpot error:', err)
      alert('Failed to send to HubSpot')
    } finally {
      setSendingToHubSpot(false)
    }
  }

  const handleSendToPartner = async () => {
    if (!selectedDeal || !partnerEmail) return
    if (selectedDeal.type !== 'email_intake') {
      alert('Can only request info for email intakes')
      return
    }
    setSendingToPartner(true)

    try {
      const baseUrl = window.location.origin
      const prefillUrl = `${baseUrl}/register/${selectedDeal.id}?requestInfo=true`
      await navigator.clipboard.writeText(prefillUrl)

      alert(`Form link copied to clipboard!\n\nSend this to ${partnerEmail}:\n${prefillUrl}`)

      // Update status
      await fetch(`/api/email-intake/${selectedDeal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'reviewed',
          review_notes: `Sent to partner: ${partnerEmail}`,
          send_to_partner: true,
          partner_email: partnerEmail,
        })
      })

      setShowSendToPartnerModal(false)
      setPartnerEmail('')
      await fetchData()
    } catch (err) {
      console.error('Send to partner error:', err)
      alert('Failed to generate link')
    } finally {
      setSendingToPartner(false)
    }
  }

  const handleReject = async () => {
    if (!selectedDeal) return
    const reason = prompt('Enter rejection reason (optional):')

    try {
      if (selectedDeal.type === 'email_intake') {
        await supabase
          .from('email_intakes')
          .update({
            status: 'discarded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedDeal.id)
      } else {
        await fetch(`/api/registrations/${selectedDeal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', rejection_reason: reason }),
        })
      }

      await fetchData()
      setSelectedDeal(null)
    } catch (err) {
      console.error('Reject error:', err)
      alert('Failed to reject')
    }
  }

  const handleDelete = async () => {
    if (!selectedDeal) return
    if (!confirm('Are you sure you want to permanently delete this? This cannot be undone.')) return

    try {
      if (selectedDeal.type === 'email_intake') {
        await fetch(`/api/email-intake/${selectedDeal.id}`, { method: 'DELETE' })
      } else {
        // For form submissions, we'll just reject them (or you could add a delete endpoint)
        await fetch(`/api/registrations/${selectedDeal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', rejection_reason: 'Deleted' }),
        })
      }

      await fetchData()
      setSelectedDeal(null)
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete')
    }
  }

  // Resolve conflict
  const handleResolveConflict = async (conflictIndex: number, usePartnerValue: boolean) => {
    if (!selectedDeal || selectedDeal.type !== 'email_intake' || !selectedDeal.conflicts) return

    const conflict = selectedDeal.conflicts[conflictIndex]
    const fieldName = `extracted_${conflict.field}`
    const newValue = usePartnerValue ? conflict.partner_value : conflict.admin_value
    const newConflicts = selectedDeal.conflicts.filter((_, i) => i !== conflictIndex)

    await supabase
      .from('email_intakes')
      .update({
        [fieldName]: newValue,
        conflicts: newConflicts.length > 0 ? newConflicts : null,
        has_conflicts: newConflicts.length > 0,
        conflicts_resolved_at: newConflicts.length === 0 ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedDeal.id)

    await fetchData()
    // Refresh selected deal
    const { data } = await supabase
      .from('email_intakes')
      .select('*')
      .eq('id', selectedDeal.id)
      .single()
    if (data) setSelectedDeal(emailIntakeToUnified(data))
  }

  if (isAuthChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background-subtle)' }}>
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary-600)', borderTopColor: 'transparent' }}></div>
          <p style={{ color: 'var(--foreground-muted)' }}>{isAuthChecking ? 'Checking authorization...' : 'Loading...'}</p>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold">Deal Registrations</h1>
                <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Manage all submissions in one place</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Administrator</p>
              </div>
              <Link href="/admin/users" className="btn btn-secondary">
                Manage Users
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {(['inbox', 'pending_info', 'ready', 'archive'] as const).map(tab => {
            const config = tab === 'archive'
              ? { label: 'Archive', color: '#6b7280', description: 'Completed & rejected' }
              : STATUS_CONFIG[tab]
            const count = stats[tab]
            const isActive = activeTab === tab

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-3 px-4 rounded-lg transition-all relative"
                style={{
                  backgroundColor: isActive ? 'var(--primary-600)' : 'transparent',
                  color: isActive ? 'white' : 'var(--foreground)',
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium">{config.label}</span>
                  {count > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : config.color + '20',
                        color: isActive ? 'white' : config.color,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5 opacity-75">{config.description}</p>
              </button>
            )
          })}
        </div>

        {/* Deals Table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Source</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Customer</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Partner (TA)</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>TSD</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Status</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Date</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map(deal => {
                const statusConfig = STATUS_CONFIG[deal.status]
                const missingFields = getMissingRequiredFields(deal)

                return (
                  <tr key={`${deal.type}-${deal.id}`} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td className="p-4">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: deal.type === 'email_intake' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: deal.type === 'email_intake' ? '#3b82f6' : '#10b981',
                        }}
                      >
                        {deal.source_label}
                      </span>
                      {deal.email_subject && (
                        <p className="text-xs mt-1 truncate max-w-[150px]" style={{ color: 'var(--foreground-muted)' }}>
                          {deal.email_subject}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{deal.customer_company_name || '-'}</p>
                      <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                        {deal.customer_first_name} {deal.customer_last_name}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{deal.ta_company_name || '-'}</p>
                      <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{deal.ta_full_name || '-'}</p>
                    </td>
                    <td className="p-4">
                      <p>{deal.tsd_name || '-'}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium inline-block w-fit"
                          style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                        >
                          {statusConfig.label}
                        </span>
                        {deal.has_conflicts && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
                            Has Conflicts
                          </span>
                        )}
                        {missingFields.length > 0 && deal.status !== 'completed' && deal.status !== 'rejected' && (
                          <span className="text-xs" style={{ color: 'var(--warning-600)' }}>
                            {missingFields.length} missing field{missingFields.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{formatDate(deal.created_at)}</p>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedDeal(deal)}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        {deal.status === 'completed' || deal.status === 'rejected' ? 'View' : 'Review'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredDeals.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--foreground-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p style={{ color: 'var(--foreground-muted)' }}>
                      {activeTab === 'inbox' && 'No new submissions'}
                      {activeTab === 'pending_info' && 'No items waiting for partner info'}
                      {activeTab === 'ready' && 'No items ready to send'}
                      {activeTab === 'archive' && 'No archived items'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedDeal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedDeal(null)
              setEditMode(false)
            }
          }}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-semibold">
                      {editMode ? 'Edit Details' : 'Deal Details'}
                    </h2>
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: STATUS_CONFIG[selectedDeal.status].bgColor,
                        color: STATUS_CONFIG[selectedDeal.status].color
                      }}
                    >
                      {STATUS_CONFIG[selectedDeal.status].label}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    {selectedDeal.customer_company_name || 'Unknown Company'} • {selectedDeal.source_label}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedDeal(null); setEditMode(false); }}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Missing Fields Warning */}
              {(() => {
                const data = editMode ? editData : selectedDeal
                const missingFields = getMissingRequiredFields(data as UnifiedDeal)
                if (missingFields.length > 0 && selectedDeal.status !== 'completed' && selectedDeal.status !== 'rejected') {
                  return (
                    <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error-500)' }}>
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--error-500)' }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--error-600)' }}>Missing Required Fields</p>
                          <p className="text-sm mt-1" style={{ color: 'var(--error-600)' }}>
                            {missingFields.join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Conflicts Section */}
              {selectedDeal.has_conflicts && selectedDeal.conflicts && selectedDeal.conflicts.length > 0 && (
                <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid var(--warning-500)' }}>
                  <p className="font-medium mb-3" style={{ color: 'var(--warning-700)' }}>Resolve Conflicts</p>
                  <p className="text-sm mb-4" style={{ color: 'var(--warning-600)' }}>
                    Partner submitted different values. Choose which to keep:
                  </p>
                  <div className="space-y-3">
                    {selectedDeal.conflicts.map((conflict, index) => (
                      <div key={index} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                        <p className="font-medium text-sm mb-2">
                          {conflict.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Your Value</p>
                            <div className="p-2 rounded text-sm" style={{ backgroundColor: 'var(--background-subtle)' }}>
                              {String(conflict.admin_value || '-')}
                            </div>
                            <button
                              onClick={() => handleResolveConflict(index, false)}
                              className="btn btn-secondary w-full mt-2"
                              style={{ padding: '0.375rem', fontSize: '0.75rem' }}
                            >
                              Keep This
                            </button>
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Partner Value</p>
                            <div className="p-2 rounded text-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                              {String(conflict.partner_value || '-')}
                            </div>
                            <button
                              onClick={() => handleResolveConflict(index, true)}
                              className="btn btn-primary w-full mt-2"
                              style={{ padding: '0.375rem', fontSize: '0.75rem' }}
                            >
                              Use This
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Preview (for email intakes) */}
              {selectedDeal.type === 'email_intake' && selectedDeal.email_body_plain && (
                <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--background-subtle)' }}>
                  <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--foreground-muted)' }}>Original Email</h3>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedDeal.email_body_plain.substring(0, 500)}
                    {selectedDeal.email_body_plain.length > 500 && '...'}
                  </p>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-6">
                {/* Customer Info */}
                <section>
                  <h3 className="font-semibold mb-3">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="First Name" field="customer_first_name" value={editMode ? editData.customer_first_name : selectedDeal.customer_first_name} onChange={handleFieldChange} editMode={editMode} required />
                    <FormField label="Last Name" field="customer_last_name" value={editMode ? editData.customer_last_name : selectedDeal.customer_last_name} onChange={handleFieldChange} editMode={editMode} required />
                    <FormField label="Company" field="customer_company_name" value={editMode ? editData.customer_company_name : selectedDeal.customer_company_name} onChange={handleFieldChange} editMode={editMode} required />
                    <FormField label="Email" field="customer_email" value={editMode ? editData.customer_email : selectedDeal.customer_email} onChange={handleFieldChange} editMode={editMode} required />
                    <FormField label="Phone" field="customer_phone" value={editMode ? editData.customer_phone : selectedDeal.customer_phone} onChange={handleFieldChange} editMode={editMode} />
                    <FormField label="Job Title" field="customer_job_title" value={editMode ? editData.customer_job_title : selectedDeal.customer_job_title} onChange={handleFieldChange} editMode={editMode} />
                  </div>
                </section>

                {/* Partner/TA Info */}
                <section>
                  <h3 className="font-semibold mb-3">Partner (Trusted Advisor)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Full Name" field="ta_full_name" value={editMode ? editData.ta_full_name : selectedDeal.ta_full_name} onChange={handleFieldChange} editMode={editMode} required />
                    <FormField label="Company" field="ta_company_name" value={editMode ? editData.ta_company_name : selectedDeal.ta_company_name} onChange={handleFieldChange} editMode={editMode} required />
                    <FormField label="Email" field="ta_email" value={editMode ? editData.ta_email : selectedDeal.ta_email} onChange={handleFieldChange} editMode={editMode} required />
                    <FormField label="Phone" field="ta_phone" value={editMode ? editData.ta_phone : selectedDeal.ta_phone} onChange={handleFieldChange} editMode={editMode} />
                  </div>
                </section>

                {/* TSD Info */}
                <section>
                  <h3 className="font-semibold mb-3">TSD Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {editMode ? (
                      <div>
                        <label className="block text-sm font-medium mb-1">TSD <span style={{ color: 'var(--error-500)' }}>*</span></label>
                        <select
                          value={editData.tsd_name || ''}
                          onChange={(e) => handleFieldChange('tsd_name', e.target.value)}
                          className="form-input form-select"
                        >
                          <option value="">Select TSD...</option>
                          {TSD_OPTIONS.map(tsd => (
                            <option key={tsd} value={tsd}>{tsd}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <FormField label="TSD" field="tsd_name" value={selectedDeal.tsd_name} onChange={handleFieldChange} editMode={false} required />
                    )}
                    <FormField label="Contact Name" field="tsd_contact_name" value={editMode ? editData.tsd_contact_name : selectedDeal.tsd_contact_name} onChange={handleFieldChange} editMode={editMode} />
                    <FormField label="Contact Email" field="tsd_contact_email" value={editMode ? editData.tsd_contact_email : selectedDeal.tsd_contact_email} onChange={handleFieldChange} editMode={editMode} />
                  </div>
                </section>

                {/* Opportunity Info */}
                <section>
                  <h3 className="font-semibold mb-3">Opportunity Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {editMode ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">Agent Count</label>
                          <select
                            value={editData.agent_count || ''}
                            onChange={(e) => handleFieldChange('agent_count', e.target.value)}
                            className="form-input form-select"
                          >
                            <option value="">Select...</option>
                            {AGENT_COUNT_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Timeline</label>
                          <select
                            value={editData.implementation_timeline || ''}
                            onChange={(e) => handleFieldChange('implementation_timeline', e.target.value)}
                            className="form-input form-select"
                          >
                            <option value="">Select...</option>
                            {TIMELINE_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <FormField label="Agent Count" field="agent_count" value={selectedDeal.agent_count} onChange={handleFieldChange} editMode={false} />
                        <FormField label="Timeline" field="implementation_timeline" value={selectedDeal.implementation_timeline} onChange={handleFieldChange} editMode={false} />
                      </>
                    )}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Solutions Interested</label>
                      {editMode ? (
                        <div className="flex flex-wrap gap-2">
                          {SOLUTIONS_OPTIONS.map(solution => {
                            const current = (editData.solutions_interested as string[]) || []
                            const isChecked = current.includes(solution)
                            return (
                              <button
                                key={solution}
                                type="button"
                                onClick={() => {
                                  const newSolutions = isChecked
                                    ? current.filter(s => s !== solution)
                                    : [...current, solution]
                                  handleFieldChange('solutions_interested', newSolutions)
                                }}
                                className="px-3 py-1.5 rounded-lg text-sm"
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
                          {(selectedDeal.solutions_interested || []).length > 0 ? (
                            selectedDeal.solutions_interested!.map(s => (
                              <span key={s} className="px-3 py-1 rounded-lg text-sm" style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}>
                                {s}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: 'var(--foreground-muted)' }}>-</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Description</label>
                      {editMode ? (
                        <textarea
                          value={editData.opportunity_description || ''}
                          onChange={(e) => handleFieldChange('opportunity_description', e.target.value)}
                          rows={3}
                          className="form-input form-textarea"
                        />
                      ) : (
                        <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: 'var(--background-subtle)' }}>
                          {selectedDeal.opportunity_description || '-'}
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
                    <button onClick={() => setEditMode(false)} className="btn btn-secondary flex-1">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : selectedDeal.status === 'completed' || selectedDeal.status === 'rejected' ? (
                  // Archive view - just close
                  <button onClick={() => setSelectedDeal(null)} className="btn btn-secondary w-full">
                    Close
                  </button>
                ) : (
                  <>
                    <button onClick={handleEdit} className="btn btn-secondary">
                      Edit
                    </button>
                    {selectedDeal.type === 'email_intake' && (
                      <button
                        onClick={() => {
                          setPartnerEmail(selectedDeal.ta_email || '')
                          setShowSendToPartnerModal(true)
                        }}
                        className="btn btn-secondary"
                        style={{ borderColor: 'var(--warning-500)', color: 'var(--warning-600)' }}
                      >
                        Request Info
                      </button>
                    )}
                    <button
                      onClick={handleReject}
                      className="btn btn-secondary"
                      style={{ borderColor: 'var(--error-500)', color: 'var(--error-500)' }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleSendToHubSpot}
                      disabled={sendingToHubSpot || getMissingRequiredFields(selectedDeal).length > 0}
                      className="btn btn-primary flex-1"
                      style={{
                        backgroundColor: getMissingRequiredFields(selectedDeal).length === 0 ? 'var(--success-500)' : 'var(--foreground-muted)',
                        cursor: getMissingRequiredFields(selectedDeal).length === 0 ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {sendingToHubSpot ? 'Sending...' : 'Send to HubSpot'}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="btn"
                      style={{ backgroundColor: 'var(--error-500)', color: 'white', padding: '0.5rem' }}
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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
            <h3 className="text-lg font-semibold mb-4">Request More Info</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--foreground-muted)' }}>
              Generate a pre-filled form link for the partner to complete missing information.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Partner Email</label>
              <input
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                className="form-input"
                placeholder="partner@company.com"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSendToPartnerModal(false)} className="btn btn-secondary flex-1">
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

// Reusable form field component
function FormField({
  label,
  field,
  value,
  onChange,
  editMode,
  required,
}: {
  label: string
  field: string
  value: string | undefined
  onChange: (field: string, value: string) => void
  editMode: boolean
  required?: boolean
}) {
  const isEmpty = !value || value.trim() === ''

  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span style={{ color: 'var(--error-500)' }}> *</span>}
        {required && isEmpty && !editMode && (
          <span className="ml-2 text-xs" style={{ color: 'var(--error-500)' }}>Missing</span>
        )}
      </label>
      {editMode ? (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(field, e.target.value)}
          className="form-input"
          style={{
            borderColor: required && isEmpty ? 'var(--error-500)' : undefined,
          }}
        />
      ) : (
        <p
          className="text-sm p-3 rounded-lg"
          style={{
            backgroundColor: 'var(--background-subtle)',
            color: value ? 'var(--foreground)' : 'var(--foreground-muted)',
            borderLeft: required && isEmpty ? '3px solid var(--error-500)' : '3px solid transparent',
          }}
        >
          {value || '-'}
        </p>
      )}
    </div>
  )
}
