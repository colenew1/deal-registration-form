'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase'

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
  const supabase = useMemo(() => createClientComponentClient(), [])
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
      // 1. Create auth user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            company_name: formData.company_name,
          }
        }
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('Failed to create account. Please try again.')
        return
      }

      // 2. Create legacy partners record for backwards compatibility
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .insert({
          email: formData.email.toLowerCase(),
          password_hash: 'migrated_to_supabase_auth',
          full_name: formData.full_name,
          company_name: formData.company_name,
          phone: formData.phone || null,
          tsd_name: formData.tsd_name || null,
          auth_user_id: authData.user.id,
        })
        .select('id')
        .single()

      if (partnerError) {
        console.error('Partner record creation failed:', partnerError)
        // Don't fail registration if partner record fails - we can fix this later
      }

      // 3. Create user_profile record
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          role: 'partner',
          full_name: formData.full_name,
          email: formData.email.toLowerCase(),
          company_name: formData.company_name,
          phone: formData.phone || null,
          tsd_name: formData.tsd_name || null,
          legacy_partner_id: partnerData?.id || null,
        })

      if (profileError) {
        console.error('Profile creation failed:', profileError)
        setError('Account created but profile setup failed. Please contact support.')
        return
      }

      // 4. Redirect to dashboard
      router.push('/partner/dashboard')

    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Registration error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--background)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-600)' }}>
            AmplifAI
          </h1>
          <p className="mt-2" style={{ color: 'var(--foreground-muted)' }}>
            Partner Portal
          </p>
        </div>

        {/* Register Card */}
        <div className="rounded-xl p-8 shadow-lg" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
            Create your account
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="John Smith"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Acme Corp"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="you@company.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
                placeholder="(555) 123-4567"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                TSD / Distributor
              </label>
              <select
                name="tsd_name"
                value={formData.tsd_name}
                onChange={handleChange}
                className="form-select"
                disabled={isLoading}
              >
                <option value="">Select your TSD (optional)</option>
                {TSD_OPTIONS.map(tsd => (
                  <option key={tsd} value={tsd}>{tsd}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="••••••••"
                minLength={8}
                disabled={isLoading}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                Minimum 8 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--primary-600)',
                color: 'white',
              }}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-medium hover:underline" style={{ color: 'var(--primary-600)' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm" style={{ color: 'var(--foreground-muted)' }}>
          Need help? Contact{' '}
          <a href="mailto:greynolds@amplifai.com" className="hover:underline" style={{ color: 'var(--primary-600)' }}>
            greynolds@amplifai.com
          </a>
        </p>
      </div>
    </div>
  )
}
