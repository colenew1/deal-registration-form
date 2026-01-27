'use client'

import { useState, useEffect, use, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient, type UserProfile } from '@/lib/supabase'

/**
 * Pre-filled Registration Form Page
 *
 * This page displays a registration form pre-filled with data extracted
 * from an email intake. Users can review, edit, and submit the form.
 *
 * Features:
 * - Visual indicators for auto-filled vs empty fields
 * - Confidence indicators showing extraction reliability
 * - Ability to view the original email content
 * - Validation before submission
 */

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

interface EmailIntake {
  id: string
  created_at: string
  status: string
  email_from: string | null
  email_from_name: string | null
  email_subject: string | null
  email_body_plain: string | null
  parsed_data: {
    warnings?: string[]
    rawText?: string
  } | null
  confidence_scores: Record<string, number> | null

  // Extracted fields
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
  extracted_deal_value: string | null
}

// Confidence indicator component
function ConfidenceIndicator({ score, fieldName }: { score: number | undefined, fieldName: string }) {
  if (score === undefined || score === 0) return null

  const getColor = () => {
    if (score >= 80) return 'var(--success-500)'
    if (score >= 60) return 'var(--warning-500)'
    return 'var(--error-500)'
  }

  const getLabel = () => {
    if (score >= 80) return 'High confidence'
    if (score >= 60) return 'Medium confidence'
    return 'Low confidence - please verify'
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xs ml-2"
      style={{ color: getColor() }}
      title={`${getLabel()} (${score}%) - Auto-extracted from email`}
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        {score >= 60 ? (
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        ) : (
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        )}
      </svg>
      <span className="hidden sm:inline">{score >= 80 ? 'Auto-filled' : score >= 60 ? 'Review' : 'Verify'}</span>
    </span>
  )
}

// Form Input Component with confidence indicator
function FormInput({
  label,
  required,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  className = '',
  confidence,
  wasAutoFilled,
  needsInfo,
}: {
  label: string
  required?: boolean
  type?: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
  confidence?: number
  wasAutoFilled?: boolean
  needsInfo?: boolean
}) {
  const showError = needsInfo && required && !value
  return (
    <div className={className}>
      <label htmlFor={name} className={`form-label ${required ? 'form-label-required' : ''}`}>
        {label}
        {wasAutoFilled && <ConfidenceIndicator score={confidence} fieldName={name} />}
        {showError && <span className="ml-2 text-xs" style={{ color: 'var(--error-500)' }}>Required</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={`form-input ${wasAutoFilled ? 'ring-2 ring-primary-100' : ''}`}
        style={
          showError
            ? { borderColor: 'var(--error-500)', borderWidth: '2px' }
            : wasAutoFilled
            ? { borderColor: 'var(--primary-400)' }
            : undefined
        }
      />
    </div>
  )
}

// Form Select Component
function FormSelect({
  label,
  required,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
  confidence,
  wasAutoFilled,
  needsInfo,
}: {
  label: string
  required?: boolean
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: string[]
  placeholder?: string
  className?: string
  confidence?: number
  wasAutoFilled?: boolean
  needsInfo?: boolean
}) {
  const showError = needsInfo && required && !value
  return (
    <div className={className}>
      <label htmlFor={name} className={`form-label ${required ? 'form-label-required' : ''}`}>
        {label}
        {wasAutoFilled && <ConfidenceIndicator score={confidence} fieldName={name} />}
        {showError && <span className="ml-2 text-xs" style={{ color: 'var(--error-500)' }}>Required</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={`form-input form-select ${wasAutoFilled ? 'ring-2 ring-primary-100' : ''}`}
        style={
          showError
            ? { borderColor: 'var(--error-500)', borderWidth: '2px' }
            : wasAutoFilled
            ? { borderColor: 'var(--primary-400)' }
            : undefined
        }
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  )
}

// Section Header Component
function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <h2 className="section-heading">
      <span className="step-indicator">{step}</span>
      {title}
    </h2>
  )
}

function RegistrationFormContent({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClientComponentClient(), [])
  const requestInfo = searchParams.get('requestInfo') === 'true'

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [intake, setIntake] = useState<EmailIntake | null>(null)
  const [showOriginalEmail, setShowOriginalEmail] = useState(false)
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null)

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

  // Track which fields were auto-filled
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())

  // Fetch the email intake data
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

        // Track auto-filled fields and populate form
        const filled = new Set<string>()
        const newFormData = { ...formData }

        // Map extracted fields to form fields
        const fieldMappings: Array<{ extracted: keyof EmailIntake, form: keyof typeof formData }> = [
          { extracted: 'extracted_customer_first_name', form: 'customer_first_name' },
          { extracted: 'extracted_customer_last_name', form: 'customer_last_name' },
          { extracted: 'extracted_customer_job_title', form: 'customer_job_title' },
          { extracted: 'extracted_customer_company_name', form: 'customer_company_name' },
          { extracted: 'extracted_customer_email', form: 'customer_email' },
          { extracted: 'extracted_customer_phone', form: 'customer_phone' },
          { extracted: 'extracted_customer_street_address', form: 'customer_street_address' },
          { extracted: 'extracted_customer_city', form: 'customer_city' },
          { extracted: 'extracted_customer_state', form: 'customer_state' },
          { extracted: 'extracted_customer_postal_code', form: 'customer_postal_code' },
          { extracted: 'extracted_customer_country', form: 'customer_country' },
          { extracted: 'extracted_agent_count', form: 'agent_count' },
          { extracted: 'extracted_implementation_timeline', form: 'implementation_timeline' },
          { extracted: 'extracted_opportunity_description', form: 'opportunity_description' },
          { extracted: 'extracted_ta_full_name', form: 'ta_full_name' },
          { extracted: 'extracted_ta_email', form: 'ta_email' },
          { extracted: 'extracted_ta_phone', form: 'ta_phone' },
          { extracted: 'extracted_ta_company_name', form: 'ta_company_name' },
          { extracted: 'extracted_tsd_name', form: 'tsd_name' },
          { extracted: 'extracted_tsd_contact_name', form: 'tsd_contact_name' },
          { extracted: 'extracted_tsd_contact_email', form: 'tsd_contact_email' },
        ]

        for (const { extracted, form } of fieldMappings) {
          const value = data[extracted]
          if (value && typeof value === 'string') {
            (newFormData as Record<string, string | string[]>)[form] = value
            filled.add(form)
          }
        }

        // Handle solutions array
        if (data.extracted_solutions_interested && data.extracted_solutions_interested.length > 0) {
          newFormData.solutions_interested = data.extracted_solutions_interested
          filled.add('solutions_interested')
        }

        // Check if partner is logged in and auto-fill their info
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profile && profile.role === 'partner') {
            setPartnerProfile(profile)
            // Auto-fill partner fields from profile (only if not already filled from email)
            if (profile.full_name && !newFormData.ta_full_name) {
              newFormData.ta_full_name = profile.full_name
              filled.add('ta_full_name')
            }
            if (profile.email && !newFormData.ta_email) {
              newFormData.ta_email = profile.email
              filled.add('ta_email')
            }
            if (profile.company_name && !newFormData.ta_company_name) {
              newFormData.ta_company_name = profile.company_name
              filled.add('ta_company_name')
            }
            if (profile.phone && !newFormData.ta_phone) {
              newFormData.ta_phone = profile.phone
              filled.add('ta_phone')
            }
            if (profile.tsd_name && !newFormData.tsd_name) {
              newFormData.tsd_name = profile.tsd_name
              filled.add('tsd_name')
            }
          }
        }

        setFormData(newFormData)
        setAutoFilledFields(filled)

        // Mark intake as reviewed (but not if partner is filling info)
        if (!requestInfo) {
          await fetch(`/api/email-intake/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'reviewed' })
          })
        }

      } catch (err) {
        console.error('Error fetching intake:', err)
        setError('Failed to load registration data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchIntake()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, requestInfo, supabase])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (formData.solutions_interested.length === 0) {
      setError('Please select at least one solution')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: 'email_import',
          original_email_content: intake?.email_body_plain || null
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      const registration = await res.json()

      // Mark intake as converted
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

  // Get confidence score for a field
  const getConfidence = (fieldName: string): number | undefined => {
    if (!intake?.confidence_scores) return undefined
    // Map form field names to confidence score keys
    const mappings: Record<string, string> = {
      customer_first_name: 'customer_first_name',
      customer_last_name: 'customer_last_name',
      customer_company_name: 'customer_company_name',
      customer_email: 'customer_email',
      customer_phone: 'customer_phone',
      ta_full_name: 'ta_full_name',
      ta_email: 'ta_email',
      ta_company_name: 'ta_company_name',
      tsd_name: 'tsd_name',
      agent_count: 'agent_count',
      implementation_timeline: 'implementation_timeline',
    }
    const key = mappings[fieldName] || fieldName
    return intake.confidence_scores[key]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background-subtle)' }}>
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto spinner" style={{ color: 'var(--primary-600)' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4" style={{ color: 'var(--foreground-muted)' }}>Loading registration data...</p>
        </div>
      </div>
    )
  }

  if (error && !intake) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background-subtle)' }}>
        <div className="card p-8 max-w-md text-center">
          <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--error-500)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-xl font-semibold mb-2">Registration Not Found</h1>
          <p style={{ color: 'var(--foreground-muted)' }}>{error}</p>
          <a href="/" className="btn btn-primary mt-6 inline-block">
            Go to Registration Form
          </a>
        </div>
      </div>
    )
  }

  const warnings = intake?.parsed_data?.warnings || []

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background-subtle)' }}>
      {/* Header */}
      <header className="page-header">
        <div className="container">
          <div className="flex items-center gap-3">
            <div className="icon-container w-10 h-10 rounded-lg" style={{ backgroundColor: 'var(--primary-600)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold">AmplifAI Partner Portal</h1>
              <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Deal Registration</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl font-semibold mb-2">Review Deal Registration</h1>
            <p style={{ color: 'var(--foreground-muted)' }}>
              We&apos;ve pre-filled the form based on the email. Please review and complete any missing fields.
            </p>
            {/* Partner login prompt */}
            {!partnerProfile && (
              <p className="mt-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
                <a
                  href={`/login?redirect=/register/${id}${requestInfo ? '?requestInfo=true' : ''}`}
                  className="font-medium hover:underline"
                  style={{ color: 'var(--primary-600)' }}
                >
                  Log in as a partner
                </a>
                {' '}to auto-fill your contact info, or{' '}
                <a
                  href="/partner/register"
                  className="font-medium hover:underline"
                  style={{ color: 'var(--primary-600)' }}
                >
                  create an account
                </a>
              </p>
            )}
          </div>

          {/* Request Info Banner - shown when partner needs to fill gaps */}
          {requestInfo && (
            <div className="alert mb-6 animate-fade-in" style={{ backgroundColor: 'var(--warning-50)', borderColor: 'var(--warning-200)', color: 'var(--warning-800)' }}>
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--warning-500)' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Action Required: Please complete the highlighted fields</p>
                <p className="text-sm mt-1">
                  Fields with a red border are required but missing information. Please fill them in and submit the form.
                </p>
              </div>
            </div>
          )}

          {/* Partner Logged In Banner */}
          {partnerProfile && (
            <div className="alert mb-6 animate-fade-in" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)', color: '#166534' }}>
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#16a34a' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Logged in as {partnerProfile.full_name}</p>
                <p className="text-sm mt-1">
                  Your partner information has been auto-filled. ({partnerProfile.company_name})
                </p>
              </div>
            </div>
          )}

          {/* Info Banner */}
          {!requestInfo && (
            <div className="alert alert-info mb-6 animate-fade-in">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Auto-filled from email</p>
                <p className="text-sm mt-1">
                  Fields with a colored border were extracted from the forwarded email.
                  {autoFilledFields.size > 0 && ` (${autoFilledFields.size} fields auto-filled)`}
                </p>
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="alert alert-error mb-6 animate-fade-in">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Please verify these fields:</p>
                <ul className="text-sm mt-1 list-disc list-inside">
                  {warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* View Original Email Toggle */}
          {intake?.email_body_plain && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowOriginalEmail(!showOriginalEmail)}
                className="btn btn-secondary text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {showOriginalEmail ? 'Hide Original Email' : 'View Original Email'}
              </button>

              {showOriginalEmail && (
                <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border-color)' }}>
                  <div className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <p className="text-sm"><strong>From:</strong> {intake.email_from_name} &lt;{intake.email_from}&gt;</p>
                    <p className="text-sm"><strong>Subject:</strong> {intake.email_subject}</p>
                  </div>
                  <pre className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground-muted)', fontFamily: 'inherit' }}>
                    {intake.email_body_plain}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Error Alert */}
          {error && intake && (
            <div className="alert alert-error mb-6 animate-fade-in">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p>{error}</p>
            </div>
          )}

          {/* Main Form Card */}
          <form onSubmit={handleSubmit} className="card card-elevated p-6 sm:p-8 animate-fade-in">
            {/* Section 1: Customer Information */}
            <section className="opacity-0 animate-fade-in stagger-1">
              <SectionHeader step={1} title="Customer Information" />

              <div className="grid-form">
                <FormInput
                  label="First Name"
                  required
                  name="customer_first_name"
                  value={formData.customer_first_name}
                  onChange={handleChange}
                  placeholder="John"
                  wasAutoFilled={autoFilledFields.has('customer_first_name')}
                  confidence={getConfidence('customer_first_name')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Last Name"
                  required
                  name="customer_last_name"
                  value={formData.customer_last_name}
                  onChange={handleChange}
                  placeholder="Smith"
                  wasAutoFilled={autoFilledFields.has('customer_last_name')}
                  confidence={getConfidence('customer_last_name')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Job Title"
                  required
                  name="customer_job_title"
                  value={formData.customer_job_title}
                  onChange={handleChange}
                  placeholder="Contact Center Manager"
                  wasAutoFilled={autoFilledFields.has('customer_job_title')}
                  confidence={getConfidence('customer_job_title')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Company Name"
                  required
                  name="customer_company_name"
                  value={formData.customer_company_name}
                  onChange={handleChange}
                  placeholder="SMSC Gaming Enterprise"
                  wasAutoFilled={autoFilledFields.has('customer_company_name')}
                  confidence={getConfidence('customer_company_name')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Email"
                  required
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  placeholder="jsmith@company.com"
                  wasAutoFilled={autoFilledFields.has('customer_email')}
                  confidence={getConfidence('customer_email')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Phone"
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  placeholder="952-445-9000"
                  wasAutoFilled={autoFilledFields.has('customer_phone')}
                  confidence={getConfidence('customer_phone')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Street Address"
                  name="customer_street_address"
                  value={formData.customer_street_address}
                  onChange={handleChange}
                  placeholder="2400 Mystic Lake Blvd"
                  className="grid-form-full"
                  wasAutoFilled={autoFilledFields.has('customer_street_address')}
                  confidence={getConfidence('customer_street_address')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="City"
                  name="customer_city"
                  value={formData.customer_city}
                  onChange={handleChange}
                  placeholder="Prior Lake"
                  wasAutoFilled={autoFilledFields.has('customer_city')}
                  confidence={getConfidence('customer_city')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="State / Region"
                  name="customer_state"
                  value={formData.customer_state}
                  onChange={handleChange}
                  placeholder="MN"
                  wasAutoFilled={autoFilledFields.has('customer_state')}
                  confidence={getConfidence('customer_state')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Postal Code"
                  name="customer_postal_code"
                  value={formData.customer_postal_code}
                  onChange={handleChange}
                  placeholder="55372"
                  wasAutoFilled={autoFilledFields.has('customer_postal_code')}
                  confidence={getConfidence('customer_postal_code')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Country"
                  name="customer_country"
                  value={formData.customer_country}
                  onChange={handleChange}
                  placeholder="USA"
                  wasAutoFilled={autoFilledFields.has('customer_country')}
                  confidence={getConfidence('customer_country')}
                  needsInfo={requestInfo}
                />
              </div>
            </section>

            <div className="section-divider" />

            {/* Section 2: Opportunity Details */}
            <section className="opacity-0 animate-fade-in stagger-2">
              <SectionHeader step={2} title="Opportunity Details" />

              <div className="grid-form">
                <FormSelect
                  label="Number of Contact Center Agents"
                  required
                  name="agent_count"
                  value={formData.agent_count}
                  onChange={handleChange}
                  options={AGENT_COUNTS}
                  placeholder="Select range"
                  wasAutoFilled={autoFilledFields.has('agent_count')}
                  confidence={getConfidence('agent_count')}
                  needsInfo={requestInfo}
                />
                <FormSelect
                  label="Implementation Timeline"
                  name="implementation_timeline"
                  value={formData.implementation_timeline}
                  onChange={handleChange}
                  options={TIMELINES}
                  placeholder="Select timeline"
                  wasAutoFilled={autoFilledFields.has('implementation_timeline')}
                  confidence={getConfidence('implementation_timeline')}
                  needsInfo={requestInfo}
                />

                {/* Solutions Checkboxes */}
                <div className="grid-form-full">
                  <label className="form-label form-label-required">
                    Which solutions are they looking for?
                    {autoFilledFields.has('solutions_interested') && (
                      <ConfidenceIndicator score={getConfidence('solutions_interested')} fieldName="solutions_interested" />
                    )}
                    {requestInfo && formData.solutions_interested.length === 0 && (
                      <span className="ml-2 text-xs" style={{ color: 'var(--error-500)' }}>Required</span>
                    )}
                  </label>
                  <div
                    className="option-grid"
                    style={requestInfo && formData.solutions_interested.length === 0 ? {
                      border: '2px solid var(--error-500)',
                      borderRadius: '0.5rem',
                      padding: '0.5rem'
                    } : undefined}
                  >
                    {SOLUTIONS.map(solution => (
                      <div key={solution} className="option-item">
                        <input
                          type="checkbox"
                          id={`solution-${solution}`}
                          checked={formData.solutions_interested.includes(solution)}
                          onChange={() => handleSolutionChange(solution)}
                          className="form-checkbox"
                        />
                        <label htmlFor={`solution-${solution}`}>{solution}</label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Opportunity Description */}
                <div className="grid-form-full">
                  <label htmlFor="opportunity_description" className="form-label form-label-required">
                    Opportunity Description
                    {autoFilledFields.has('opportunity_description') && (
                      <ConfidenceIndicator score={getConfidence('opportunity_description')} fieldName="opportunity_description" />
                    )}
                    {requestInfo && !formData.opportunity_description && (
                      <span className="ml-2 text-xs" style={{ color: 'var(--error-500)' }}>Required</span>
                    )}
                  </label>
                  <p className="form-helper" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                    Describe the customer&apos;s use case, challenges, and goals. Include any competing solutions or integrations needed.
                  </p>
                  <textarea
                    id="opportunity_description"
                    name="opportunity_description"
                    value={formData.opportunity_description}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Customer's use case, challenges, goals, current solutions, and any competition..."
                    className={`form-input form-textarea ${autoFilledFields.has('opportunity_description') ? 'ring-2 ring-primary-100' : ''}`}
                    style={
                      requestInfo && !formData.opportunity_description
                        ? { borderColor: 'var(--error-500)', borderWidth: '2px' }
                        : autoFilledFields.has('opportunity_description')
                        ? { borderColor: 'var(--primary-400)' }
                        : undefined
                    }
                  />
                </div>
              </div>
            </section>

            <div className="section-divider" />

            {/* Section 3: Partner Information */}
            <section className="opacity-0 animate-fade-in stagger-3">
              <SectionHeader step={3} title="Partner Information (Trusted Advisor)" />

              <div className="grid-form">
                <FormInput
                  label="Full Name"
                  required
                  name="ta_full_name"
                  value={formData.ta_full_name}
                  onChange={handleChange}
                  placeholder="Mallory Santucci"
                  wasAutoFilled={autoFilledFields.has('ta_full_name')}
                  confidence={getConfidence('ta_full_name')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Company Name"
                  required
                  name="ta_company_name"
                  value={formData.ta_company_name}
                  onChange={handleChange}
                  placeholder="SHI"
                  wasAutoFilled={autoFilledFields.has('ta_company_name')}
                  confidence={getConfidence('ta_company_name')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Email"
                  required
                  type="email"
                  name="ta_email"
                  value={formData.ta_email}
                  onChange={handleChange}
                  placeholder="mallory_santucci@shi.com"
                  wasAutoFilled={autoFilledFields.has('ta_email')}
                  confidence={getConfidence('ta_email')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Phone"
                  type="tel"
                  name="ta_phone"
                  value={formData.ta_phone}
                  onChange={handleChange}
                  placeholder="555-555-5555"
                  wasAutoFilled={autoFilledFields.has('ta_phone')}
                  confidence={getConfidence('ta_phone')}
                  needsInfo={requestInfo}
                />
              </div>
            </section>

            <div className="section-divider" />

            {/* Section 4: TSD Information */}
            <section className="opacity-0 animate-fade-in stagger-4">
              <SectionHeader step={4} title="TSD Information" />

              <div className="grid-form">
                <FormInput
                  label="TSD Name"
                  required
                  name="tsd_name"
                  value={formData.tsd_name}
                  onChange={handleChange}
                  placeholder="Avant"
                  wasAutoFilled={autoFilledFields.has('tsd_name')}
                  confidence={getConfidence('tsd_name')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Contact Name"
                  name="tsd_contact_name"
                  value={formData.tsd_contact_name}
                  onChange={handleChange}
                  placeholder="Emely Irula"
                  wasAutoFilled={autoFilledFields.has('tsd_contact_name')}
                  confidence={getConfidence('tsd_contact_name')}
                  needsInfo={requestInfo}
                />
                <FormInput
                  label="Contact Email"
                  type="email"
                  name="tsd_contact_email"
                  value={formData.tsd_contact_email}
                  onChange={handleChange}
                  placeholder="eirula@goavant.net"
                  className="grid-form-full sm:col-span-1"
                  wasAutoFilled={autoFilledFields.has('tsd_contact_email')}
                  confidence={getConfidence('tsd_contact_email')}
                  needsInfo={requestInfo}
                />
              </div>
            </section>

            {/* Submit Button */}
            <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary btn-large w-full"
              >
                {submitting ? (
                  <>
                    <svg className="w-5 h-5 spinner" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting Registration...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit Deal Registration
                  </>
                )}
              </button>
              <p className="text-center mt-4 text-sm" style={{ color: 'var(--foreground-muted)' }}>
                By submitting, you agree to our deal registration program terms and conditions.
              </p>
            </div>
          </form>

          {/* Footer */}
          <footer className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              Need help? Contact <a href="mailto:greynolds@amplifai.com" className="hover:underline" style={{ color: 'var(--primary-600)' }}>greynolds@amplifai.com</a>
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--foreground-muted)' }}>
              Powered by AmplifAI
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}

// Loading component for Suspense
function FormLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background-subtle)' }}>
      <div className="text-center">
        <svg className="w-12 h-12 mx-auto spinner" style={{ color: 'var(--primary-600)' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4" style={{ color: 'var(--foreground-muted)' }}>Loading registration form...</p>
      </div>
    </div>
  )
}

// Default export wrapper with Suspense for useSearchParams
export default function PrefilledRegistrationForm({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)

  return (
    <Suspense fallback={<FormLoading />}>
      <RegistrationFormContent id={resolvedParams.id} />
    </Suspense>
  )
}
