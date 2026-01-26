'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/partner/dashboard'
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (errorParam === 'account_inactive') {
      setError('Your account has been deactivated. Please contact support.')
    }
  }, [errorParam])

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Get user profile to determine redirect
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/partner/dashboard')
        }
      }
    }
    checkAuth()
  }, [supabase, router])

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
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .single()

      if (profile && !profile.is_active) {
        await supabase.auth.signOut()
        setError('Your account has been deactivated. Please contact support.')
        setIsLoading(false)
        return
      }

      // Redirect based on role
      if (profile?.role === 'admin') {
        router.push('/admin')
      } else if (redirect.startsWith('/admin')) {
        // Partner trying to access admin - redirect to partner dashboard instead
        router.push('/partner/dashboard')
      } else {
        router.push(redirect)
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--background)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-600)' }}>
            AmplifAI
          </h1>
          <p className="mt-2" style={{ color: 'var(--foreground-muted)' }}>
            Deal Registration Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl p-8 shadow-lg" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
            Sign in to your account
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
                placeholder="you@company.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--card-border)' }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--foreground-muted)' }}>
                or
              </span>
            </div>
          </div>

          {/* Guest Access */}
          <button
            onClick={handleGuestContinue}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--primary-600)',
              border: '2px solid var(--primary-600)',
            }}
          >
            Continue as Guest
          </button>
          <p className="mt-2 text-xs text-center" style={{ color: 'var(--foreground-muted)' }}>
            Submit a deal registration without creating an account
          </p>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/partner/register" className="font-medium hover:underline" style={{ color: 'var(--primary-600)' }}>
                Register as Partner
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
