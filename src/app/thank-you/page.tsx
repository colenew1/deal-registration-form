'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import { useSupabaseClient } from '@/lib/supabase-client'

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
}

function ThankYouContent() {
  const searchParams = useSearchParams()
  const supabase = useSupabaseClient()
  const message = searchParams.get('message')
  const hasConflicts = message === 'submitted-with-conflicts'

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true)
      return
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !user.email?.endsWith('@amplifai.com')) {
        setIsLoggedIn(true)
      }
      setAuthChecked(true)
    }).catch(() => setAuthChecked(true))
  }, [supabase])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
      {/* Header */}
      <header style={{ backgroundColor: colors.white, borderBottom: `1px solid ${colors.border}`, padding: '16px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.primary, margin: 0 }}>AmplifAI</h1>
          <span style={{ padding: '4px 10px', backgroundColor: colors.bg, borderRadius: 4, fontSize: 12, color: colors.textMuted }}>Deal Registration</span>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
        <div style={{ backgroundColor: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, padding: 48, textAlign: 'center' }}>
          {/* Success Icon */}
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: colors.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg style={{ width: 32, height: 32, color: colors.success }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 24, fontWeight: 600, color: colors.text, margin: '0 0 12px' }}>
            {hasConflicts ? 'Information Submitted for Review' : 'Registration Submitted Successfully'}
          </h1>

          {/* Description */}
          <p style={{ fontSize: 14, color: colors.textMuted, margin: '0 0 32px' }}>
            {hasConflicts
              ? 'Thank you for updating the information. Some of your changes differ from what our team entered. An admin will review and resolve any differences.'
              : 'Thank you for submitting your deal registration. Our team has received your submission.'}
          </p>

          {/* Partner Portal CTA */}
          {authChecked && (
            <div style={{ marginBottom: 24, padding: 20, backgroundColor: colors.primaryLight, borderRadius: 10, border: `1px solid ${colors.primary}20` }}>
              {isLoggedIn ? (
                <>
                  <p style={{ margin: '0 0 12px', fontSize: 14, color: colors.text }}>
                    Track the status of your submission in the Partner Portal.
                  </p>
                  <Link
                    href="/partner/dashboard"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 600,
                      backgroundColor: colors.primary,
                      color: colors.white,
                      borderRadius: 8,
                      textDecoration: 'none',
                    }}
                  >
                    Go to Partner Portal
                  </Link>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500, color: colors.text }}>
                    Want to track your submission?
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: colors.textMuted }}>
                    Log in or create an account to see updates on your deal registrations.
                  </p>
                  <Link
                    href="/login?redirect=/partner/dashboard"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 600,
                      backgroundColor: colors.primary,
                      color: colors.white,
                      borderRadius: 8,
                      textDecoration: 'none',
                    }}
                  >
                    Log In to Partner Portal
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: colors.white,
              color: colors.primary,
              border: `1px solid ${colors.primary}`,
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Submit Another Registration
          </Link>

          <p style={{ marginTop: 16, fontSize: 13, color: colors.textMuted }}>
            Have questions? Contact{' '}
            <a href="mailto:greynolds@amplifai.com" style={{ color: colors.primary, textDecoration: 'none' }}>
              greynolds@amplifai.com
            </a>
          </p>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
            Powered by AmplifAI
          </p>
        </footer>
      </main>
    </div>
  )
}

export default function ThankYou() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <p style={{ color: colors.textMuted }}>Loading...</p>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  )
}
