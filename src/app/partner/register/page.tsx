'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabaseClient } from '@/lib/supabase-client'

// Light mode color palette (matches admin panel)
const colors = {
  bg: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  textMuted: '#64748b',
  primary: '#2563eb',
  primaryLight: '#dbeafe',
  primaryText: '#1e40af',
  error: '#dc2626',
  errorLight: '#fee2e2',
  errorText: '#991b1b',
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

export default function PartnerRegister() {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    company_name: '',
    phone: '',
    tsd_name: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      // Use server-side signup API to bypass RLS
      const signupUrl = new URL('/api/auth/signup', window.location.origin)
      const res = await fetch(signupUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          company_name: formData.company_name,
          phone: formData.phone,
          tsd_name: formData.tsd_name,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create account')
        return
      }

      // Sign in with the newly created account
      if (supabase) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        if (signInError) {
          console.error('Sign in error:', signInError)
          // Account was created, just redirect to login
          router.push('/login?message=Account created. Please sign in.')
          return
        }
      }

      // Redirect to dashboard
      router.push('/partner/dashboard')

    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Registration error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: colors.primary, margin: 0 }}>AmplifAI</h1>
          <p style={{ marginTop: 8, color: colors.textMuted, fontSize: 14 }}>Partner Portal</p>
        </div>

        {/* Register Card */}
        <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>Create your account</h2>
          </div>

          <div style={{ padding: 24 }}>
            {error && (
              <div style={{ marginBottom: 20, padding: 12, backgroundColor: colors.errorLight, border: `1px solid ${colors.error}`, borderRadius: 6 }}>
                <p style={{ margin: 0, fontSize: 14, color: colors.errorText }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                    Full Name <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    placeholder="John Smith"
                    disabled={isLoading}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white, color: colors.text }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                    Company Name <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                    placeholder="Acme Corp"
                    disabled={isLoading}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white, color: colors.text }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                    Email <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="you@company.com"
                    disabled={isLoading}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white, color: colors.text }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    disabled={isLoading}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white, color: colors.text }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                  TSD / Distributor
                </label>
                <select
                  name="tsd_name"
                  value={formData.tsd_name}
                  onChange={handleChange}
                  disabled={isLoading}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white, color: colors.text }}
                >
                  <option value="">Select your TSD (optional)</option>
                  {TSD_OPTIONS.map(tsd => (
                    <option key={tsd} value={tsd}>{tsd}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                    Password <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    minLength={8}
                    disabled={isLoading}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white, color: colors.text }}
                  />
                  <p style={{ marginTop: 4, fontSize: 11, color: colors.textMuted }}>Minimum 8 characters</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                    Confirm Password <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    disabled={isLoading}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white, color: colors.text }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: colors.primary,
                  color: colors.white,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>
                Already have an account?{' '}
                <Link href="/login" style={{ fontWeight: 500, color: colors.primary, textDecoration: 'none' }}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: colors.textMuted }}>
          Need help? Contact{' '}
          <a href="mailto:greynolds@amplifai.com" style={{ color: colors.primary, textDecoration: 'none' }}>
            greynolds@amplifai.com
          </a>
        </p>
      </div>
    </div>
  )
}
