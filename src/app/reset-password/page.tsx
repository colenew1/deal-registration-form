'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase'

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
  success: '#16a34a',
  successLight: '#dcfce7',
  successText: '#166534',
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  const supabase = useMemo(() => createClientComponentClient(), [])

  // Check if we have a valid session from the reset link
  useEffect(() => {
    const checkSession = async () => {
      // Supabase handles the token exchange automatically when the page loads
      // We just need to check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setIsValidSession(true)
      } else {
        // Check URL for error or if there's a code parameter that needs to be exchanged
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (errorParam) {
          setError(errorDescription || 'Invalid or expired reset link')
          setIsValidSession(false)
        } else {
          // Wait a moment for Supabase to process the token
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession()
            if (retrySession) {
              setIsValidSession(true)
            } else {
              setError('Invalid or expired reset link. Please request a new one.')
              setIsValidSession(false)
            }
          }, 1000)
        }
      }
    }

    checkSession()
  }, [supabase, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message)
        setIsLoading(false)
        return
      }

      setSuccess(true)

      // Sign out after password reset so they can log in fresh
      await supabase.auth.signOut()

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      console.error('Reset password error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (isValidSession === null) {
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
          <p style={{ marginTop: 16, textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>Verifying reset link...</p>
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

      {/* Card */}
      <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>Set new password</h2>
        </div>

        <div style={{ padding: 24 }}>
          {success ? (
            <div>
              <div style={{ marginBottom: 20, padding: 12, backgroundColor: colors.successLight, border: `1px solid ${colors.success}`, borderRadius: 6 }}>
                <p style={{ margin: 0, fontSize: 14, color: colors.successText }}>
                  Your password has been reset successfully. Redirecting to sign in...
                </p>
              </div>
              <Link
                href="/login"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: colors.primary,
                  color: colors.white,
                  border: 'none',
                  borderRadius: 6,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Sign In Now
              </Link>
            </div>
          ) : !isValidSession ? (
            <div>
              <div style={{ marginBottom: 20, padding: 12, backgroundColor: colors.errorLight, border: `1px solid ${colors.error}`, borderRadius: 6 }}>
                <p style={{ margin: 0, fontSize: 14, color: colors.errorText }}>{error}</p>
              </div>
              <Link
                href="/forgot-password"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: colors.primary,
                  color: colors.white,
                  border: 'none',
                  borderRadius: 6,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Request New Reset Link
              </Link>
            </div>
          ) : (
            <>
              <p style={{ marginBottom: 20, fontSize: 14, color: colors.textMuted }}>
                Enter your new password below.
              </p>

              {error && (
                <div style={{ marginBottom: 20, padding: 12, backgroundColor: colors.errorLight, border: `1px solid ${colors.error}`, borderRadius: 6 }}>
                  <p style={{ margin: 0, fontSize: 14, color: colors.errorText }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    disabled={isLoading}
                    minLength={8}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white, color: colors.text }}
                  />
                  <p style={{ marginTop: 4, fontSize: 12, color: colors.textMuted }}>
                    Must be at least 8 characters
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    disabled={isLoading}
                    minLength={8}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${colors.border}`, borderRadius: 6, backgroundColor: colors.white, color: colors.text }}
                  />
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
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
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

function ResetPasswordLoading() {
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

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg }}>
      <Suspense fallback={<ResetPasswordLoading />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
