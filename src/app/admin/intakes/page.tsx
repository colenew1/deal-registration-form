'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This page has been consolidated into the main admin dashboard
// Redirecting for backwards compatibility
export default function AdminIntakesRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background-subtle)' }}>
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary-600)', borderTopColor: 'transparent' }}></div>
        <p style={{ color: 'var(--foreground-muted)' }}>Redirecting to unified dashboard...</p>
      </div>
    </div>
  )
}
