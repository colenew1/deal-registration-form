'use client'

import { useState } from 'react'
import Link from 'next/link'

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong')
        setIsLoading(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      console.error('Forgot password error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/Amp Logo.png" alt="AmplifAI" style={{ height: 40 }} />
          <p style={{ marginTop: 8, color: colors.textMuted, fontSize: 14 }}>Deal Registration Portal</p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>Reset your password</h2>
          </div>

          <div style={{ padding: 24 }}>
            {success ? (
              <div>
                <div style={{ marginBottom: 20, padding: 12, backgroundColor: colors.successLight, border: `1px solid ${colors.success}`, borderRadius: 6 }}>
                  <p style={{ margin: 0, fontSize: 14, color: colors.successText }}>
                    Check your email for a password reset link. If you don&apos;t see it, check your spam folder.
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
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <>
                <p style={{ marginBottom: 20, fontSize: 14, color: colors.textMuted }}>
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>

                {error && (
                  <div style={{ marginBottom: 20, padding: 12, backgroundColor: colors.errorLight, border: `1px solid ${colors.error}`, borderRadius: 6 }}>
                    <p style={{ margin: 0, fontSize: 14, color: colors.errorText }}>{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 20 }}>
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
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>

                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <Link href="/login" style={{ fontSize: 14, color: colors.primary, textDecoration: 'none' }}>
                    Back to Sign In
                  </Link>
                </div>
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
    </div>
  )
}
