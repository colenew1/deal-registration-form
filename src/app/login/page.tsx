'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase'

// Light mode color palette (matches admin panel)
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

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/partner/dashboard'
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [authState, setAuthState] = useState<'checking' | 'ready' | 'redirecting'>('checking')

  const supabase = useMemo(() => createClientComponentClient(), [])
  const hasCheckedAuth = useMemo(() => ({ current: false }), [])

  useEffect(() => {
    if (errorParam === 'account_inactive') {
      setError('Your account has been deactivated. Please contact support.')
    }
  }, [errorParam])

  // Check if already logged in - only run once
  useEffect(() => {
    if (hasCheckedAuth.current) return
    hasCheckedAuth.current = true

    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Get user profile to determine redirect
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role, is_active')
            .eq('id', user.id)
            .single()

          // If no profile exists, try to create one from auth metadata
          if (profileError && profileError.code === 'PGRST116') {
            console.log('No profile found, attempting to create one...')
            const metadata = user.user_metadata || {}
            const { error: createError } = await supabase
              .from('user_profiles')
              .insert({
                id: user.id,
                role: 'partner',
                full_name: metadata.full_name || user.email?.split('@')[0] || 'Unknown',
                email: user.email || '',
                company_name: metadata.company_name || null,
              })

            if (createError) {
              console.error('Failed to create profile:', createError)
              await supabase.auth.signOut()
              setError('Your account is missing profile data. Please contact support or register again.')
              setAuthState('ready')
              return
            }

            // Profile created, redirect to partner dashboard
            setAuthState('redirecting')
            router.replace('/partner/dashboard')
            return
          }

          if (profileError) {
            console.error('Profile fetch error:', profileError)
            setAuthState('ready')
            return
          }

          // Check if account is active
          if (profile && !profile.is_active) {
            await supabase.auth.signOut()
            setError('Your account has been deactivated. Please contact support.')
            setAuthState('ready')
            return
          }

          setAuthState('redirecting')
          if (profile?.role === 'admin') {
            router.replace('/admin')
          } else {
            router.replace('/partner/dashboard')
          }
          return
        }
      } catch (err) {
        console.error('Auth check error:', err)
      }
      setAuthState('ready')
    }
    checkAuth()
  }, [supabase, router, hasCheckedAuth])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setIsLoading(false)
        return
      }

      if (!data.user) {
        setError('Login failed. Please try again.')
        setIsLoading(false)
        return
      }

      // Check user profile and redirect based on role
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .single()

      // If no profile exists, try to create one from auth metadata
      if (profileError && profileError.code === 'PGRST116') {
        console.log('No profile found after login, creating one...')
        const metadata = data.user.user_metadata || {}
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            role: 'partner',
            full_name: metadata.full_name || data.user.email?.split('@')[0] || 'Unknown',
            email: data.user.email || '',
            company_name: metadata.company_name || null,
          })

        if (createError) {
          console.error('Failed to create profile:', createError)
          await supabase.auth.signOut()
          setError('Failed to set up your account. Please contact support.')
          setIsLoading(false)
          return
        }

        // Profile created, redirect to partner dashboard
        router.replace('/partner/dashboard')
        return
      }

      if (profile && !profile.is_active) {
        await supabase.auth.signOut()
        setError('Your account has been deactivated. Please contact support.')
        setIsLoading(false)
        return
      }

      // Redirect based on role - use replace to prevent back button loop
      if (profile?.role === 'admin') {
        router.replace('/admin')
      } else if (redirect.startsWith('/admin')) {
        // Partner trying to access admin - redirect to partner dashboard instead
        router.replace('/partner/dashboard')
      } else {
        router.replace(redirect)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const handleGuestContinue = () => {
    router.push('/')
  }

  // Show loading while checking auth or redirecting
  if (authState !== 'ready') {
    return (
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/Amp Logo.png" alt="AmplifAI" style={{ height: 40 }} />
          <p style={{ marginTop: 8, color: colors.textMuted, fontSize: 14 }}>Deal Registration Portal</p>
        </div>
        <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, border: `2px solid ${colors.primary}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img src="/Amp Logo.png" alt="AmplifAI" style={{ height: 40 }} />
        <p style={{ marginTop: 8, color: colors.textMuted, fontSize: 14 }}>Deal Registration Portal</p>
      </div>

      {/* Login Card */}
      <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>Sign in to your account</h2>
        </div>

        <div style={{ padding: 24 }}>
          {error && (
            <div style={{ marginBottom: 20, padding: 12, backgroundColor: colors.errorLight, border: `1px solid ${colors.error}`, borderRadius: 6 }}>
              <p style={{ margin: 0, fontSize: 14, color: colors.errorText }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                disabled={isLoading}
                style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white, color: colors.text }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={isLoading}
                style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white, color: colors.text }}
              />
            </div>

            <div style={{ marginBottom: 20, textAlign: 'right' }}>
              <Link href="/forgot-password" style={{ fontSize: 13, color: colors.primary, textDecoration: 'none' }}>
                Forgot password?
              </Link>
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
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ position: 'relative', margin: '24px 0' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '100%', borderTop: `1px solid ${colors.border}` }}></div>
            </div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <span style={{ padding: '0 12px', backgroundColor: colors.white, color: colors.textMuted, fontSize: 13 }}>or</span>
            </div>
          </div>

          {/* Guest Access */}
          <button
            onClick={handleGuestContinue}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 500,
              backgroundColor: colors.white,
              color: colors.primary,
              border: `2px solid ${colors.primary}`,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Continue as Guest
          </button>
          <p style={{ marginTop: 8, fontSize: 12, textAlign: 'center', color: colors.textMuted }}>
            Submit a deal registration without creating an account
          </p>

          {/* Register Link */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>
              Don&apos;t have an account?{' '}
              <Link href="/partner/register" style={{ fontWeight: 500, color: colors.primary, textDecoration: 'none' }}>
                Register as Partner
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
  )
}

function LoginLoading() {
  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img src="/Amp Logo.png" alt="AmplifAI" style={{ height: 40 }} />
        <p style={{ marginTop: 8, color: colors.textMuted, fontSize: 14 }}>Deal Registration Portal</p>
      </div>
      <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 24, height: 24, border: `2px solid ${colors.primary}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg }}>
      <Suspense fallback={<LoginLoading />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
