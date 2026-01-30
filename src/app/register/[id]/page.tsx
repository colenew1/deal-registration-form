'use client'

import { useState, useEffect, use, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSupabaseClient } from '@/lib/supabase-client'
import type { UserProfile } from '@/lib/supabase'

// Light mode color palette
const colors = {
  bg: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  textMuted: '#64748b',
  primary: '#2563eb',
  primaryLight: '#dbeafe',
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#d97706',
  warningLight: '#fef3c7',
  warningText: '#92400e',
  error: '#dc2626',
  errorLight: '#fee2e2',
  errorText: '#991b1b',
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  backgroundColor: colors.white,
  color: colors.text,
}

// Required fields on this form
const REQUIRED_FIELDS = new Set([
  'customer_first_name', 'customer_last_name', 'customer_job_title',
  'customer_company_name', 'customer_email',
  'ta_full_name', 'ta_email', 'ta_company_name',
  'tsd_name', 'agent_count', 'solutions_interested', 'opportunity_description',
])

// Optional fields that get yellow highlight when empty
const OPTIONAL_FIELDS = new Set([
  'customer_phone', 'customer_street_address', 'customer_city',
  'customer_state', 'customer_postal_code', 'customer_country',
  'ta_phone', 'implementation_timeline', 'tsd_contact_name', 'tsd_contact_email',
])

function getFieldInputStyle(fieldName: string, value: string | string[]) {
  const isEmpty = Array.isArray(value) ? value.length === 0 : !value
  if (!isEmpty) {
    // Pre-filled fields get a subtle green-tinted style so they look distinct from empty ones
    return { ...inputStyle, border: `1.5px solid #86efac`, backgroundColor: '#f0fdf4' }
  }
  if (REQUIRED_FIELDS.has(fieldName)) {
    return { ...inputStyle, border: `2px solid ${colors.error}`, backgroundColor: '#fff5f5' }
  }
  if (OPTIONAL_FIELDS.has(fieldName)) {
    return { ...inputStyle, border: `2px solid ${colors.warning}`, backgroundColor: '#fffbeb' }
  }
  return inputStyle
}

// Returns empty string for placeholder when the field is highlighted (empty),
// so the user doesn't confuse placeholder text with actual data
function getPlaceholder(fieldName: string, defaultPlaceholder: string, value: string | string[]) {
  const isEmpty = Array.isArray(value) ? value.length === 0 : !value
  if (isEmpty && (REQUIRED_FIELDS.has(fieldName) || OPTIONAL_FIELDS.has(fieldName))) {
    return ''
  }
  return defaultPlaceholder
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: 6,
  textTransform: 'uppercase' as const,
}

const TSD_OPTIONS = ['Avant', 'Telarus']

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
  '1-19', '20-49', '50-100', '101 to 249', '250 to 499', '500 to 999', '1000 to 2499', '2500 to 4999', '5000+',
]

const TIMELINES = [
  '0-3 months', '4-6 months', '6-12 months', '12+ months',
]

interface EmailIntake {
  id: string
  email_body_plain: string | null
  email_from: string | null
  email_from_name: string | null
  email_subject: string | null
  extracted_ta_full_name: string | null
  extracted_ta_email: string | null
  extracted_ta_phone: string | null
  extracted_ta_company_name: string | null
  extracted_tsd_name: string | null
  extracted_tsd_contact_name: string | null
  extracted_tsd_contact_email: string | null
  extracted_customer_first_name: string | null
  extracted_customer_last_name: string | null
  extracted_customer_company_name: string | null
  extracted_customer_email: string | null
  extracted_customer_phone: string | null
  extracted_customer_job_title: string | null
  extracted_customer_street_address: string | null
  extracted_customer_city: string | null
  extracted_customer_state: string | null
  extracted_customer_postal_code: string | null
  extracted_customer_country: string | null
  extracted_agent_count: string | null
  extracted_implementation_timeline: string | null
  extracted_solutions_interested: string[] | null
  extracted_opportunity_description: string | null
}

function RegistrationFormContent({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useSupabaseClient()
  const requestInfo = searchParams.get('requestInfo') === 'true'

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [intake, setIntake] = useState<EmailIntake | null>(null)
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null)
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [accountEmail, setAccountEmail] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [accountFullName, setAccountFullName] = useState('')
  const [accountCompanyName, setAccountCompanyName] = useState('')
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const [formData, setFormData] = useState({
    customer_first_name: '',
    customer_last_name: '',
    customer_job_title: '',
    customer_company_name: '',
    customer_email: '',
    customer_phone: '',
    customer_street_address: '',
    customer_city: '',
    customer_state: '',
    customer_postal_code: '',
    customer_country: '',
    agent_count: '',
    implementation_timeline: '',
    solutions_interested: [] as string[],
    opportunity_description: '',
    ta_full_name: '',
    ta_email: '',
    ta_phone: '',
    ta_company_name: '',
    tsd_name: '',
    tsd_contact_name: '',
    tsd_contact_email: '',
  })

  useEffect(() => {
    async function fetchIntake() {
      try {
        const res = await fetch(`/api/email-intake/${id}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('This registration link is invalid or has expired.')
          } else {
            throw new Error('Failed to fetch intake data')
          }
          setLoading(false)
          return
        }

        const data: EmailIntake = await res.json()
        setIntake(data)

        const newFormData = { ...formData }

        // Map extracted fields to form
        if (data.extracted_customer_first_name) newFormData.customer_first_name = data.extracted_customer_first_name
        if (data.extracted_customer_last_name) newFormData.customer_last_name = data.extracted_customer_last_name
        if (data.extracted_customer_job_title) newFormData.customer_job_title = data.extracted_customer_job_title
        if (data.extracted_customer_company_name) newFormData.customer_company_name = data.extracted_customer_company_name
        if (data.extracted_customer_email) newFormData.customer_email = data.extracted_customer_email
        if (data.extracted_customer_phone) newFormData.customer_phone = data.extracted_customer_phone
        if (data.extracted_customer_street_address) newFormData.customer_street_address = data.extracted_customer_street_address
        if (data.extracted_customer_city) newFormData.customer_city = data.extracted_customer_city
        if (data.extracted_customer_state) newFormData.customer_state = data.extracted_customer_state
        if (data.extracted_customer_postal_code) newFormData.customer_postal_code = data.extracted_customer_postal_code
        if (data.extracted_customer_country) newFormData.customer_country = data.extracted_customer_country
        if (data.extracted_agent_count) newFormData.agent_count = data.extracted_agent_count
        if (data.extracted_implementation_timeline) newFormData.implementation_timeline = data.extracted_implementation_timeline
        if (data.extracted_opportunity_description) newFormData.opportunity_description = data.extracted_opportunity_description
        if (data.extracted_ta_full_name) newFormData.ta_full_name = data.extracted_ta_full_name
        if (data.extracted_ta_email) newFormData.ta_email = data.extracted_ta_email
        if (data.extracted_ta_phone) newFormData.ta_phone = data.extracted_ta_phone
        if (data.extracted_ta_company_name) newFormData.ta_company_name = data.extracted_ta_company_name
        if (data.extracted_tsd_name) newFormData.tsd_name = data.extracted_tsd_name
        if (data.extracted_tsd_contact_name) newFormData.tsd_contact_name = data.extracted_tsd_contact_name
        if (data.extracted_tsd_contact_email) newFormData.tsd_contact_email = data.extracted_tsd_contact_email
        if (data.extracted_solutions_interested) newFormData.solutions_interested = data.extracted_solutions_interested

        // Pre-fill account creation fields from TA info
        if (data.extracted_ta_email) setAccountEmail(data.extracted_ta_email)
        if (data.extracted_ta_full_name) setAccountFullName(data.extracted_ta_full_name)
        if (data.extracted_ta_company_name) setAccountCompanyName(data.extracted_ta_company_name)

        // Check if partner is logged in
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', user.id)
              .single()

            if (profile && profile.role === 'partner') {
              setPartnerProfile(profile)
              if (profile.full_name && !newFormData.ta_full_name) newFormData.ta_full_name = profile.full_name
              if (profile.email && !newFormData.ta_email) newFormData.ta_email = profile.email
              if (profile.company_name && !newFormData.ta_company_name) newFormData.ta_company_name = profile.company_name
              if (profile.phone && !newFormData.ta_phone) newFormData.ta_phone = profile.phone
              if (profile.tsd_name && !newFormData.tsd_name) newFormData.tsd_name = profile.tsd_name
            }
          }
        }

        setFormData(newFormData)
      } catch (err) {
        console.error('Error fetching intake:', err)
        setError('Failed to load registration data.')
      } finally {
        setLoading(false)
      }
    }

    fetchIntake()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSolutionChange = (solution: string) => {
    setFormData(prev => ({
      ...prev,
      solutions_interested: prev.solutions_interested.includes(solution)
        ? prev.solutions_interested.filter(s => s !== solution)
        : [...prev.solutions_interested, solution]
    }))
  }

  const handleCreateAccount = async () => {
    if (!accountEmail || !accountPassword || !accountFullName) {
      setAccountError('Please fill in all required fields')
      return
    }

    if (accountPassword.length < 8) {
      setAccountError('Password must be at least 8 characters')
      return
    }

    setCreatingAccount(true)
    setAccountError('')

    try {
      const signupUrl = new URL('/api/auth/signup', window.location.origin)
      const res = await fetch(signupUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: accountEmail,
          password: accountPassword,
          full_name: accountFullName,
          company_name: accountCompanyName,
          tsd_name: formData.tsd_name,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      // Sign in with the new account
      if (supabase) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: accountEmail,
          password: accountPassword,
        })
        if (signInError) throw signInError

        // Fetch the new profile
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profile) {
            setPartnerProfile(profile)
            // Update form with profile data
            setFormData(prev => ({
              ...prev,
              ta_full_name: profile.full_name || prev.ta_full_name,
              ta_email: profile.email || prev.ta_email,
              ta_company_name: profile.company_name || prev.ta_company_name,
              ta_phone: profile.phone || prev.ta_phone,
              tsd_name: profile.tsd_name || prev.tsd_name,
            }))
          }
        }
      }

      setShowCreateAccount(false)
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setCreatingAccount(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHasAttemptedSubmit(true)
    setError('')

    // Custom validation for all required fields
    const missingFields: string[] = []
    REQUIRED_FIELDS.forEach(field => {
      if (field === 'solutions_interested') {
        if (formData.solutions_interested.length === 0) missingFields.push('Solutions Interested')
      } else {
        const val = formData[field as keyof typeof formData]
        if (!val || (typeof val === 'string' && !val.trim())) missingFields.push(field)
      }
    })

    if (missingFields.length > 0) {
      setError(`Please fill in all required fields (${missingFields.length} missing)`)
      // Scroll to the first empty required field
      const firstMissing = missingFields[0]
      const fieldName = firstMissing === 'Solutions Interested' ? 'solutions_interested' : firstMissing
      const el = document.querySelector(`[name="${fieldName}"]`) as HTMLElement
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)

    try {
      if (requestInfo && intake) {
        const res = await fetch(`/api/email-intake/${intake.id}/partner-submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to submit')
        }

        const result = await res.json()
        router.push(result.has_conflicts ? '/thank-you?message=submitted-with-conflicts' : '/thank-you')
        return
      }

      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          partner_id: partnerProfile?.id || null,
          source: 'email_import',
          original_email_content: intake?.email_body_plain || null
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      const registration = await res.json()

      if (intake) {
        await fetch(`/api/email-intake/${intake.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'converted',
            converted_registration_id: registration.id
          })
        })
      }

      router.push('/thank-you')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <p style={{ color: colors.textMuted }}>Loading registration data...</p>
      </div>
    )
  }

  if (error && !intake) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 48, maxWidth: 400, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: colors.text, margin: '0 0 12px' }}>Registration Not Found</h1>
          <p style={{ color: colors.textMuted, margin: '0 0 24px' }}>{error}</p>
          <Link href="/" style={{ padding: '10px 20px', backgroundColor: colors.primary, color: colors.white, borderRadius: 6, textDecoration: 'none', fontWeight: 500 }}>
            Go to Registration Form
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      {/* Header */}
      <header style={{ backgroundColor: colors.white, borderBottom: `1px solid ${colors.border}`, padding: '16px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.primary, margin: 0 }}>AmplifAI</h1>
          <span style={{ padding: '4px 10px', backgroundColor: colors.bg, borderRadius: 4, fontSize: 12, color: colors.textMuted }}>Deal Registration</span>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        {/* Page Title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: colors.text, margin: 0 }}>Review Deal Registration</h1>
          <p style={{ marginTop: 8, color: colors.textMuted, fontSize: 14 }}>
            Please review the pre-filled information and complete any missing fields.
          </p>
        </div>

        {/* Email Pre-fill Disclaimer */}
        <div style={{ marginBottom: 24, padding: 20, backgroundColor: colors.primaryLight, borderRadius: 12, border: `1px solid ${colors.primary}` }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: colors.primary }}>
            This form has been pre-filled from a forwarded email
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: colors.text }}>
            Our team received an email about this deal and extracted the details below. Please review for accuracy, correct anything that&apos;s wrong, and fill in any missing fields.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${colors.error}`, backgroundColor: '#fff5f5', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: colors.text }}>Required — needs to be filled</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${colors.warning}`, backgroundColor: '#fffbeb', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: colors.text }}>Optional — helpful if you have it</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid #86efac`, backgroundColor: '#f0fdf4', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: colors.text }}>Pre-filled — please verify</span>
            </div>
          </div>
        </div>

        {/* Auth Section */}
        {!partnerProfile && (
          <div style={{ marginBottom: 24, padding: 16, backgroundColor: colors.white, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, color: colors.text }}>
                  Create an account to save your info for future submissions
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.textMuted }}>
                  Your email will be linked so info auto-fills next time
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link
                  href={`/login?redirect=/register/${id}${requestInfo ? '?requestInfo=true' : ''}`}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    backgroundColor: colors.primary,
                    color: colors.white,
                    borderRadius: 6,
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Log In
                </Link>
                <button
                  type="button"
                  onClick={() => setShowCreateAccount(!showCreateAccount)}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    backgroundColor: 'transparent',
                    color: colors.primary,
                    border: `1px solid ${colors.primary}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Create Account Form */}
            {showCreateAccount && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${colors.border}` }}>
                {accountError && (
                  <div style={{ marginBottom: 12, padding: 12, backgroundColor: colors.errorLight, borderRadius: 6 }}>
                    <p style={{ margin: 0, fontSize: 13, color: colors.errorText }}>{accountError}</p>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Full Name <span style={{ color: colors.error }}>*</span></label>
                    <input type="text" value={accountFullName} onChange={e => setAccountFullName(e.target.value)} placeholder="Your name" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Company Name</label>
                    <input type="text" value={accountCompanyName} onChange={e => setAccountCompanyName(e.target.value)} placeholder="Your company" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email <span style={{ color: colors.error }}>*</span></label>
                    <input type="email" value={accountEmail} onChange={e => setAccountEmail(e.target.value)} placeholder="you@company.com" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Password <span style={{ color: colors.error }}>*</span></label>
                    <input type="password" value={accountPassword} onChange={e => setAccountPassword(e.target.value)} placeholder="Min 8 characters" style={inputStyle} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={creatingAccount}
                  style={{
                    marginTop: 12,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: colors.primary,
                    color: colors.white,
                    border: 'none',
                    borderRadius: 6,
                    cursor: creatingAccount ? 'not-allowed' : 'pointer',
                    opacity: creatingAccount ? 0.7 : 1,
                  }}
                >
                  {creatingAccount ? 'Creating...' : 'Create Account & Continue'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Logged In Banner */}
        {partnerProfile && (
          <div style={{ marginBottom: 24, padding: 16, backgroundColor: colors.successLight, borderRadius: 8, border: `1px solid ${colors.success}` }}>
            <p style={{ margin: 0, fontSize: 14, color: '#166534' }}>
              <strong>Logged in as {partnerProfile.full_name}</strong> ({partnerProfile.company_name})
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#166534' }}>
              Your partner info has been auto-filled below.
            </p>
          </div>
        )}

        {/* Request Info Banner */}
        {requestInfo && (
          <div style={{ marginBottom: 24, padding: 16, backgroundColor: colors.warningLight, borderRadius: 8, border: `1px solid ${colors.warning}` }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: colors.warningText }}>
              Action Required: Please complete the missing fields
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: colors.warningText }}>
              Fields marked with * are required. Please fill them in and submit.
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && intake && (
          <div style={{ marginBottom: 24, padding: 16, backgroundColor: colors.errorLight, border: `1px solid ${colors.error}`, borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 14, color: colors.errorText }}>{error}</p>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Section 1: Customer Information */}
          <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: colors.primary, color: colors.white, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                Customer Information
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>First Name <span style={{ color: colors.error }}>*</span></label>
                  <input type="text" name="customer_first_name" value={formData.customer_first_name} onChange={handleChange} required placeholder={getPlaceholder('customer_first_name', 'John', formData.customer_first_name)} style={getFieldInputStyle('customer_first_name', formData.customer_first_name)} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name <span style={{ color: colors.error }}>*</span></label>
                  <input type="text" name="customer_last_name" value={formData.customer_last_name} onChange={handleChange} required placeholder={getPlaceholder('customer_last_name', 'Smith', formData.customer_last_name)} style={getFieldInputStyle('customer_last_name', formData.customer_last_name)} />
                </div>
                <div>
                  <label style={labelStyle}>Job Title <span style={{ color: colors.error }}>*</span></label>
                  <input type="text" name="customer_job_title" value={formData.customer_job_title} onChange={handleChange} required placeholder={getPlaceholder('customer_job_title', 'Contact Center Manager', formData.customer_job_title)} style={getFieldInputStyle('customer_job_title', formData.customer_job_title)} />
                </div>
                <div>
                  <label style={labelStyle}>Company Name <span style={{ color: colors.error }}>*</span></label>
                  <input type="text" name="customer_company_name" value={formData.customer_company_name} onChange={handleChange} required placeholder={getPlaceholder('customer_company_name', 'Acme Corp', formData.customer_company_name)} style={getFieldInputStyle('customer_company_name', formData.customer_company_name)} />
                </div>
                <div>
                  <label style={labelStyle}>Email <span style={{ color: colors.error }}>*</span></label>
                  <input type="email" name="customer_email" value={formData.customer_email} onChange={handleChange} required placeholder={getPlaceholder('customer_email', 'jsmith@company.com', formData.customer_email)} style={getFieldInputStyle('customer_email', formData.customer_email)} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input type="tel" name="customer_phone" value={formData.customer_phone} onChange={handleChange} placeholder={getPlaceholder('customer_phone', '(555) 123-4567', formData.customer_phone)} style={getFieldInputStyle('customer_phone', formData.customer_phone)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Street Address</label>
                  <input type="text" name="customer_street_address" value={formData.customer_street_address} onChange={handleChange} placeholder={getPlaceholder('customer_street_address', '123 Main St', formData.customer_street_address)} style={getFieldInputStyle('customer_street_address', formData.customer_street_address)} />
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <input type="text" name="customer_city" value={formData.customer_city} onChange={handleChange} placeholder={getPlaceholder('customer_city', 'Austin', formData.customer_city)} style={getFieldInputStyle('customer_city', formData.customer_city)} />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <input type="text" name="customer_state" value={formData.customer_state} onChange={handleChange} placeholder={getPlaceholder('customer_state', 'TX', formData.customer_state)} style={getFieldInputStyle('customer_state', formData.customer_state)} />
                </div>
                <div>
                  <label style={labelStyle}>Postal Code</label>
                  <input type="text" name="customer_postal_code" value={formData.customer_postal_code} onChange={handleChange} placeholder={getPlaceholder('customer_postal_code', '78701', formData.customer_postal_code)} style={getFieldInputStyle('customer_postal_code', formData.customer_postal_code)} />
                </div>
                <div>
                  <label style={labelStyle}>Country</label>
                  <input type="text" name="customer_country" value={formData.customer_country} onChange={handleChange} placeholder={getPlaceholder('customer_country', 'USA', formData.customer_country)} style={getFieldInputStyle('customer_country', formData.customer_country)} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Opportunity Details */}
          <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: colors.primary, color: colors.white, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                Opportunity Details
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Number of Agents <span style={{ color: colors.error }}>*</span></label>
                  <select name="agent_count" value={formData.agent_count} onChange={handleChange} required style={getFieldInputStyle('agent_count', formData.agent_count)}>
                    <option value="">Select range</option>
                    {AGENT_COUNTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Implementation Timeline</label>
                  <select name="implementation_timeline" value={formData.implementation_timeline} onChange={handleChange} style={getFieldInputStyle('implementation_timeline', formData.implementation_timeline)}>
                    <option value="">Select timeline</option>
                    {TIMELINES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Solutions Interested <span style={{ color: colors.error }}>*</span></label>
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, padding: 12, borderRadius: 6,
                    border: formData.solutions_interested.length === 0 ? `2px solid ${colors.error}` : `1px solid ${colors.border}`,
                    backgroundColor: formData.solutions_interested.length === 0 ? colors.errorLight : 'transparent',
                  }}>
                    {SOLUTIONS.map(solution => (
                      <button
                        key={solution}
                        type="button"
                        onClick={() => handleSolutionChange(solution)}
                        style={{
                          padding: '8px 14px',
                          fontSize: 13,
                          borderRadius: 6,
                          border: `1px solid ${formData.solutions_interested.includes(solution) ? colors.primary : colors.border}`,
                          backgroundColor: formData.solutions_interested.includes(solution) ? colors.primaryLight : colors.white,
                          color: formData.solutions_interested.includes(solution) ? colors.primary : colors.text,
                          cursor: 'pointer',
                          fontWeight: formData.solutions_interested.includes(solution) ? 500 : 400,
                        }}
                      >
                        {solution}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Opportunity Description <span style={{ color: colors.error }}>*</span></label>
                  <textarea
                    name="opportunity_description"
                    value={formData.opportunity_description}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder={getPlaceholder('opportunity_description', "Customer's use case, challenges, goals...", formData.opportunity_description)}
                    style={{ ...getFieldInputStyle('opportunity_description', formData.opportunity_description), resize: 'vertical' as const }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Partner Information */}
          <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: colors.primary, color: colors.white, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                Trusted Advisor (TA) Information
                {partnerProfile && <span style={{ fontSize: 11, fontWeight: 400, color: colors.success, marginLeft: 8 }}>Auto-filled</span>}
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name <span style={{ color: colors.error }}>*</span></label>
                  <input type="text" name="ta_full_name" value={formData.ta_full_name} onChange={handleChange} required placeholder={getPlaceholder('ta_full_name', 'Jane Doe', formData.ta_full_name)} style={getFieldInputStyle('ta_full_name', formData.ta_full_name)} />
                </div>
                <div>
                  <label style={labelStyle}>Company Name <span style={{ color: colors.error }}>*</span></label>
                  <input type="text" name="ta_company_name" value={formData.ta_company_name} onChange={handleChange} required placeholder={getPlaceholder('ta_company_name', 'TA Company', formData.ta_company_name)} style={getFieldInputStyle('ta_company_name', formData.ta_company_name)} />
                </div>
                <div>
                  <label style={labelStyle}>Email <span style={{ color: colors.error }}>*</span></label>
                  <input type="email" name="ta_email" value={formData.ta_email} onChange={handleChange} required placeholder={getPlaceholder('ta_email', 'jane@company.com', formData.ta_email)} style={getFieldInputStyle('ta_email', formData.ta_email)} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input type="tel" name="ta_phone" value={formData.ta_phone} onChange={handleChange} placeholder={getPlaceholder('ta_phone', '(555) 123-4567', formData.ta_phone)} style={getFieldInputStyle('ta_phone', formData.ta_phone)} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: TSD Information */}
          <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: colors.primary, color: colors.white, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>4</span>
                TSD Information
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>TSD Name <span style={{ color: colors.error }}>*</span></label>
                  <select name="tsd_name" value={formData.tsd_name} onChange={handleChange} required style={getFieldInputStyle('tsd_name', formData.tsd_name)}>
                    <option value="">Select TSD...</option>
                    {TSD_OPTIONS.map(tsd => <option key={tsd} value={tsd}>{tsd}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Contact Name</label>
                  <input type="text" name="tsd_contact_name" value={formData.tsd_contact_name} onChange={handleChange} placeholder={getPlaceholder('tsd_contact_name', 'Contact Name', formData.tsd_contact_name)} style={getFieldInputStyle('tsd_contact_name', formData.tsd_contact_name)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Contact Email</label>
                  <input type="email" name="tsd_contact_email" value={formData.tsd_contact_email} onChange={handleChange} placeholder={getPlaceholder('tsd_contact_email', 'contact@tsd.com', formData.tsd_contact_email)} style={getFieldInputStyle('tsd_contact_email', formData.tsd_contact_email)} />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ padding: 24, backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}` }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px 20px',
                fontSize: 15,
                fontWeight: 600,
                backgroundColor: colors.primary,
                color: colors.white,
                border: 'none',
                borderRadius: 8,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Deal Registration'}
            </button>
            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: colors.textMuted }}>
              By submitting, you agree to our deal registration program terms and conditions.
            </p>
          </div>
        </form>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
            Need help? Contact{' '}
            <a href="mailto:greynolds@amplifai.com" style={{ color: colors.primary, textDecoration: 'none' }}>
              greynolds@amplifai.com
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}

function FormLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <p style={{ color: colors.textMuted }}>Loading registration form...</p>
    </div>
  )
}

export default function PrefilledRegistrationForm({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  return (
    <Suspense fallback={<FormLoading />}>
      <RegistrationFormContent id={resolvedParams.id} />
    </Suspense>
  )
}
