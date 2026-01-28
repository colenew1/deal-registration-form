'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: 6,
  textTransform: 'uppercase' as const,
}

const AGENT_COUNT_OPTIONS = [
  '1-19', '20-49', '50-99', '100-249', '250-499', '500-999', '1000-2499', '2500-4999', '5000+',
]

const TIMELINE_OPTIONS = [
  '0-3 months', '4-6 months', '6-12 months', '12+ months',
]

const SOLUTIONS = [
  'Performance Management',
  'Coaching',
  'Conversation Intelligence & Analytics',
  'Data Consolidation for CX',
  'AutoQA/QA',
  'Gamification',
  'Other',
]

const TSD_OPTIONS = [
  'Avant', 'Telarus', 'Intelisys', 'Sandler Partners', 'AppSmart', 'TBI', 'Bridgepointe', 'Other',
]

export default function SubmitDeal() {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

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
    tsd_name: '',
    tsd_contact_name: '',
    tsd_contact_email: '',
  })

  useEffect(() => {
    if (!supabase) return

    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/partner/submit')
        return
      }

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

      // Pre-fill TSD from profile
      if (profileData.tsd_name) {
        setFormData(prev => ({ ...prev, tsd_name: profileData.tsd_name || '' }))
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [router, supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSolutionToggle = (solution: string) => {
    setFormData(prev => ({
      ...prev,
      solutions_interested: prev.solutions_interested.includes(solution)
        ? prev.solutions_interested.filter(s => s !== solution)
        : [...prev.solutions_interested, solution],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setError('')
    setIsSubmitting(true)

    try {
      const { data: insertData, error: insertError } = await supabase
        .from('deal_registrations')
        .insert({
          ...formData,
          ta_full_name: profile?.full_name || '',
          ta_email: profile?.email || '',
          ta_phone: profile?.phone || '',
          ta_company_name: profile?.company_name || '',
          partner_id: profile?.id || null,
          tsd_name: formData.tsd_name || profile?.tsd_name || 'Unknown',
          source: 'form',
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        setError(insertError.message || 'Failed to submit deal')
        return
      }

      // Send Teams notification
      fetch('/api/webhooks/teams-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_type: 'new_deal',
          id: insertData?.id,
          created_at: insertData?.created_at,
          ta_full_name: profile?.full_name || '',
          ta_email: profile?.email || '',
          ta_company_name: profile?.company_name || '',
          customer_first_name: formData.customer_first_name,
          customer_last_name: formData.customer_last_name,
          customer_company_name: formData.customer_company_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          agent_count: formData.agent_count,
          implementation_timeline: formData.implementation_timeline,
          solutions_interested: formData.solutions_interested,
          opportunity_description: formData.opportunity_description,
          tsd_name: formData.tsd_name || profile?.tsd_name,
          tsd_contact_name: formData.tsd_contact_name,
          tsd_contact_email: formData.tsd_contact_email,
        }),
      }).catch(err => console.log('Teams notification error:', err))

      router.push('/partner/dashboard?submitted=true')
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Submit error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <p style={{ color: colors.textMuted }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      {/* Header */}
      <header style={{ backgroundColor: colors.white, borderBottom: `1px solid ${colors.border}`, padding: '16px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/partner/dashboard" style={{ fontSize: 20, fontWeight: 700, color: colors.primary, textDecoration: 'none' }}>
              AmplifAI
            </Link>
            <span style={{ padding: '4px 10px', backgroundColor: colors.bg, borderRadius: 4, fontSize: 12, color: colors.textMuted }}>
              Partner Portal
            </span>
          </div>
          <Link
            href="/partner/dashboard"
            style={{
              padding: '8px 16px',
              fontSize: 13,
              color: colors.textMuted,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              textDecoration: 'none',
            }}
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        {/* Page Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: colors.text, margin: 0 }}>Submit New Deal Registration</h1>
          <p style={{ marginTop: 8, color: colors.textMuted, fontSize: 14 }}>
            Submitting as <strong>{profile?.full_name}</strong> ({profile?.company_name})
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 24, padding: 16, backgroundColor: colors.errorLight, border: `1px solid ${colors.error}`, borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 14, color: colors.errorText }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Customer Information */}
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
                  <input type="text" name="customer_first_name" value={formData.customer_first_name} onChange={handleChange} required placeholder="John" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name <span style={{ color: colors.error }}>*</span></label>
                  <input type="text" name="customer_last_name" value={formData.customer_last_name} onChange={handleChange} required placeholder="Smith" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Job Title</label>
                  <input type="text" name="customer_job_title" value={formData.customer_job_title} onChange={handleChange} placeholder="VP of Operations" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Company Name <span style={{ color: colors.error }}>*</span></label>
                  <input type="text" name="customer_company_name" value={formData.customer_company_name} onChange={handleChange} required placeholder="Acme Corp" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email <span style={{ color: colors.error }}>*</span></label>
                  <input type="email" name="customer_email" value={formData.customer_email} onChange={handleChange} required placeholder="jsmith@acme.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input type="tel" name="customer_phone" value={formData.customer_phone} onChange={handleChange} placeholder="(555) 123-4567" style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Street Address</label>
                  <input type="text" name="customer_street_address" value={formData.customer_street_address} onChange={handleChange} placeholder="123 Main St" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <input type="text" name="customer_city" value={formData.customer_city} onChange={handleChange} placeholder="Austin" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <input type="text" name="customer_state" value={formData.customer_state} onChange={handleChange} placeholder="TX" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Postal Code</label>
                  <input type="text" name="customer_postal_code" value={formData.customer_postal_code} onChange={handleChange} placeholder="78701" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Country</label>
                  <input type="text" name="customer_country" value={formData.customer_country} onChange={handleChange} placeholder="USA" style={inputStyle} />
                </div>
              </div>
            </div>
          </div>

          {/* Opportunity Details */}
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
                  <label style={labelStyle}>Number of Agents</label>
                  <select name="agent_count" value={formData.agent_count} onChange={handleChange} style={inputStyle}>
                    <option value="">Select range</option>
                    {AGENT_COUNT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Implementation Timeline</label>
                  <select name="implementation_timeline" value={formData.implementation_timeline} onChange={handleChange} style={inputStyle}>
                    <option value="">Select timeline</option>
                    {TIMELINE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Solutions Interested</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {SOLUTIONS.map(solution => (
                      <button
                        key={solution}
                        type="button"
                        onClick={() => handleSolutionToggle(solution)}
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
                  <label style={labelStyle}>Opportunity Description</label>
                  <textarea
                    name="opportunity_description"
                    value={formData.opportunity_description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe the opportunity, current situation, pain points, etc."
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TSD Information */}
          <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: colors.primary, color: colors.white, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                TSD Information
                <span style={{ fontSize: 12, fontWeight: 400, color: colors.textMuted }}>(Optional)</span>
              </h2>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>TSD Name</label>
                  <select name="tsd_name" value={formData.tsd_name} onChange={handleChange} style={inputStyle}>
                    <option value="">Select TSD</option>
                    {TSD_OPTIONS.map(tsd => <option key={tsd} value={tsd}>{tsd}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>TSD Contact Name</label>
                  <input type="text" name="tsd_contact_name" value={formData.tsd_contact_name} onChange={handleChange} placeholder="Contact name" style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>TSD Contact Email</label>
                  <input type="email" name="tsd_contact_email" value={formData.tsd_contact_email} onChange={handleChange} placeholder="contact@tsd.com" style={inputStyle} />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Link
              href="/partner/dashboard"
              style={{
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 500,
                color: colors.textMuted,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                textDecoration: 'none',
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                backgroundColor: colors.primary,
                color: colors.white,
                border: 'none',
                borderRadius: 8,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Deal Registration'}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '32px 0' }}>
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
