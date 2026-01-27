'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'

// Singleton instance for client-side
let browserClientInstance: SupabaseClient | null = null

// Get or create the browser client (only call this on client side)
function getBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (browserClientInstance) {
    return browserClientInstance
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn('Supabase environment variables not configured')
    return null
  }

  browserClientInstance = createBrowserClient(url, key)
  return browserClientInstance
}

// Hook for use in components - returns null during SSR, client after hydration
export function useSupabaseClient() {
  const [client, setClient] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    const supabase = getBrowserClient()
    setClient(supabase)
  }, [])

  return client
}

// Helper to check if a URL is valid
function isValidSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// Browser client (for client components) - safe to call during SSR (returns null)
export function createClientComponentClient(): SupabaseClient {
  // During SSR or build time, check if we have valid env vars
  if (typeof window === 'undefined') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Only create client if we have valid URL and key
    if (isValidSupabaseUrl(url) && key && key.length > 10) {
      return createBrowserClient(url!, key)
    }

    // During build without valid env vars, return a mock
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Not initialized' } }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ data: null, error: null, single: async () => ({ data: null, error: null }) }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ eq: () => ({ data: null, error: null }) }),
        delete: () => ({ eq: () => ({ data: null, error: null }) }),
        eq: () => ({ data: null, error: null, single: async () => ({ data: null, error: null }), order: () => ({ data: [], error: null }) }),
        order: () => ({ data: [], error: null }),
      }),
    } as unknown as SupabaseClient
  }

  return getBrowserClient()!
}

// Legacy compatibility - for existing code that uses getSupabase()
export const getSupabase = () => {
  if (typeof window === 'undefined') {
    throw new Error('getSupabase() should only be called on the client side. Use createServerComponentClient() for server components.')
  }
  return getBrowserClient()
}

// For backwards compatibility - lazy initialization
export const supabase = {
  from: (table: string) => {
    const client = getSupabase()
    if (!client) {
      throw new Error('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    return client.from(table)
  }
}
