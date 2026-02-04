'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseClient } from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'
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

export default function RegistrationForm() {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authFullName, setAuthFullName] = useState('')
  const [authCompanyName, setAuthCompanyName] = useState('')
  const [authTsdName, setAuthTsdName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)

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

  // Check auth state on mount
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    setAuthLoading(true)
    let resolved = false
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn('Auth check timed out')
        setAuthLoading(false)
      }
    }, 5000)

    const checkAuth = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) {
          console.error('Auth check error:', userError)
          return
        }
        setUser(user)
        const isInternal = user?.email?.endsWith('@amplifai.com')
        if (user && !isInternal) {
          // Fetch user profile (skip for internal team)
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profile) {
            setUserProfile(profile)
            // Pre-fill partner fields
            setFormData(prev => ({
              ...prev,
              ta_full_name: profile.full_name || prev.ta_full_name,
              ta_email: profile.email || prev.ta_email,
              ta_phone: profile.phone || prev.ta_phone,
              ta_company_name: profile.company_name || prev.ta_company_name,
              tsd_name: profile.tsd_name || prev.tsd_name,
            }))
          }
        }
      } catch (err) {
        console.error('Auth check error:', err)
      } finally {
        resolved = true
        clearTimeout(timeout)
        setAuthLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        const isInternal = session.user.email?.endsWith('@amplifai.com')
        if (!isInternal) {
          // Fetch profile after sign in (skip for internal team)
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profile) {
            setUserProfile(profile)
            setFormData(prev => ({
              ...prev,
              ta_full_name: profile.full_name || prev.ta_full_name,
              ta_email: profile.email || prev.ta_email,
              ta_phone: profile.phone || prev.ta_phone,
              ta_company_name: profile.company_name || prev.ta_company_name,
              tsd_name: profile.tsd_name || prev.tsd_name,
            }))
          }
        }
        setShowAuthModal(false)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return

    setAuthError('')
    setAuthSubmitting(true)

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        })
        if (error) throw error
        // Redirect to partner portal on login
        router.push('/partner/dashboard')
        return
      } else {
        // Sign up via server API (to bypass RLS for profile creation)
        const res = await fetch(window.location.origin + '/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authEmail,
            password: authPassword,
            full_name: authFullName,
            company_name: authCompanyName,
            tsd_name: authTsdName,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create account')
        }

        // Now sign in with the newly created account
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        })
        if (signInError) throw signInError
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    // Clear pre-filled fields
    setFormData(prev => ({
      ...prev,
      ta_full_name: '',
      ta_email: '',
      ta_phone: '',
      ta_company_name: '',
      tsd_name: '',
    }))
  }

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
    setLoading(true)
    setError('')

    if (formData.solutions_interested.length === 0) {
      setError('Please select at least one solution')
      setLoading(false)
      return
    }

    try {
      const submitData = {
        ...formData,
        partner_id: (user && !user.email?.endsWith('@amplifai.com')) ? user.id : null,
      }
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      router.push('/thank-you')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      {/* Header */}
      <header style={{ backgroundColor: colors.white, borderBottom: `1px solid ${colors.border}`, padding: '16px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/Amp Logo.png" alt="AmplifAI" style={{ height: 32 }} />
            <span style={{ padding: '4px 10px', backgroundColor: colors.bg, borderRadius: 4, fontSize: 12, color: colors.textMuted }}>Deal Registration</span>
          </div>
          {!authLoading && !user?.email?.endsWith('@amplifai.com') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => router.push('/partner/dashboard')}
                    style={{
                      padding: '8px 16px',
                      fontSize: 13,
                      backgroundColor: colors.primary,
                      color: colors.white,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Partner Portal
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      padding: '8px 16px',
                      fontSize: 13,
                      backgroundColor: 'transparent',
                      color: colors.textMuted,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setShowAuthModal(true); setAuthError('') }}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    backgroundColor: colors.primary,
                    color: colors.white,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Partner Login
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        {/* Page Title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: colors.text, margin: 0 }}>Partner Deal Registration</h1>
          <p style={{ marginTop: 8, color: colors.textMuted, fontSize: 14 }}>
            Register a new sales opportunity to protect your deal and receive support from AmplifAI
          </p>
        </div>

        {/* Auth Status — hidden for internal @amplifai.com users */}
        {!authLoading && !(user?.email?.endsWith('@amplifai.com')) && user && (
          <div style={{ marginBottom: 24, padding: 12, backgroundColor: colors.primaryLight, borderRadius: 8, border: `1px solid ${colors.primary}20` }}>
            <p style={{ margin: 0, fontSize: 14, color: colors.primary, textAlign: 'center' }}>
              Logged in as <strong>{userProfile?.full_name || user.email}</strong> — your partner info is pre-filled below
            </p>
          </div>
        )}

        {/* Auth Modal */}
        {showAuthModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
            onClick={() => setShowAuthModal(false)}
          >
            <div
              style={{
                position: 'relative',
                backgroundColor: colors.white,
                borderRadius: 12,
                padding: 24,
                width: '100%',
                maxWidth: 400,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: colors.text }}>
                {authMode === 'login' ? 'Log In' : 'Create Account'}
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: colors.textMuted }}>
                {authMode === 'login'
                  ? 'Welcome back! Log in to auto-fill your partner info.'
                  : 'Create an account to save your info for future submissions.'}
              </p>

              {authError && (
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: colors.errorLight, borderRadius: 6 }}>
                  <p style={{ margin: 0, fontSize: 13, color: colors.errorText }}>{authError}</p>
                </div>
              )}

              <form onSubmit={handleAuth}>
                {authMode === 'signup' && (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ ...labelStyle, marginBottom: 4 }}>Full Name</label>
                      <input
                        type="text"
                        value={authFullName}
                        onChange={e => setAuthFullName(e.target.value)}
                        required
                        placeholder="Jane Doe"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ ...labelStyle, marginBottom: 4 }}>Company Name</label>
                      <input
                        type="text"
                        value={authCompanyName}
                        onChange={e => setAuthCompanyName(e.target.value)}
                        required
                        placeholder="TA Company"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ ...labelStyle, marginBottom: 4 }}>TSD Name (optional)</label>
                      <input
                        type="text"
                        value={authTsdName}
                        onChange={e => setAuthTsdName(e.target.value)}
                        placeholder="Avant"
                        style={inputStyle}
                      />
                    </div>
                  </>
                )}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>Email</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>Password</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    style={inputStyle}
                  />
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: colors.primary,
                    color: colors.white,
                    border: 'none',
                    borderRadius: 8,
                    cursor: authSubmitting ? 'not-allowed' : 'pointer',
                    opacity: authSubmitting ? 0.7 : 1,
                  }}
                >
                  {authSubmitting ? 'Please wait...' : authMode === 'login' ? 'Log In' : 'Create Account'}
                </button>
              </form>

              <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 13, color: colors.textMuted }}>
                {authMode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); setAuthError('') }}
                      style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', padding: 0, fontSize: 13 }}
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setAuthError('') }}
                      style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', padding: 0, fontSize: 13 }}
                    >
                      Log in
                    </button>
                  </>
                )}
              </p>

              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  color: colors.textMuted,
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{ marginBottom: 24, padding: 16, backgroundColor: colors.errorLight, border: `1px solid ${colors.error}`, borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 14, color: colors.errorText }}>{error}</p>
          </div>
        )}

        {/* Main Form Card */}
        <form onSubmit={handleSubmit} style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          {/* Section 1: Customer Information */}
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
                <label style={labelStyle}>Job Title <span style={{ color: colors.error }}>*</span></label>
                <input type="text" name="customer_job_title" value={formData.customer_job_title} onChange={handleChange} required placeholder="Contact Center Manager" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Company Name <span style={{ color: colors.error }}>*</span></label>
                <input type="text" name="customer_company_name" value={formData.customer_company_name} onChange={handleChange} required placeholder="Acme Corp" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email <span style={{ color: colors.error }}>*</span></label>
                <input type="email" name="customer_email" value={formData.customer_email} onChange={handleChange} required placeholder="jsmith@company.com" style={inputStyle} />
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
                <label style={labelStyle}>State / Region</label>
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

          {/* Section 2: Opportunity Details */}
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: colors.primary, color: colors.white, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
              Opportunity Details
            </h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Number of Contact Center Agents <span style={{ color: colors.error }}>*</span></label>
                <select name="agent_count" value={formData.agent_count} onChange={handleChange} required style={inputStyle}>
                  <option value="">Select range</option>
                  {AGENT_COUNTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Implementation Timeline</label>
                <select name="implementation_timeline" value={formData.implementation_timeline} onChange={handleChange} style={inputStyle}>
                  <option value="">Select timeline</option>
                  {TIMELINES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Which solutions are they looking for? <span style={{ color: colors.error }}>*</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
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
                <p style={{ fontSize: 12, color: colors.textMuted, margin: '0 0 8px' }}>Describe the customer&apos;s use case, challenges, and goals.</p>
                <textarea
                  name="opportunity_description"
                  value={formData.opportunity_description}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Customer's use case, challenges, goals, current solutions, and any competition..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Partner Information */}
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: colors.primary, color: colors.white, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
              Trusted Advisor (TA) Information
            </h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Full Name <span style={{ color: colors.error }}>*</span></label>
                <input type="text" name="ta_full_name" value={formData.ta_full_name} onChange={handleChange} required placeholder="Jane Doe" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Company Name <span style={{ color: colors.error }}>*</span></label>
                <input type="text" name="ta_company_name" value={formData.ta_company_name} onChange={handleChange} required placeholder="TA Company" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email <span style={{ color: colors.error }}>*</span></label>
                <input type="email" name="ta_email" value={formData.ta_email} onChange={handleChange} required placeholder="jane@company.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input type="tel" name="ta_phone" value={formData.ta_phone} onChange={handleChange} placeholder="(555) 123-4567" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Section 4: TSD Information */}
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: colors.primary, color: colors.white, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>4</span>
              TSD Information
            </h2>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>TSD Name <span style={{ color: colors.error }}>*</span></label>
                <select name="tsd_name" value={formData.tsd_name} onChange={handleChange} required style={inputStyle}>
                  <option value="">Select TSD...</option>
                  {TSD_OPTIONS.map(tsd => <option key={tsd} value={tsd}>{tsd}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Contact Name</label>
                <input type="text" name="tsd_contact_name" value={formData.tsd_contact_name} onChange={handleChange} placeholder="Contact Name" style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Contact Email</label>
                <input type="email" name="tsd_contact_email" value={formData.tsd_contact_email} onChange={handleChange} placeholder="contact@tsd.com" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ padding: 24, borderTop: `1px solid ${colors.border}` }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                fontSize: 15,
                fontWeight: 600,
                backgroundColor: colors.primary,
                color: colors.white,
                border: 'none',
                borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Submitting...' : 'Submit Deal Registration'}
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
