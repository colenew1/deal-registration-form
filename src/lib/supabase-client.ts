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

// Browser client (for client components) - safe to call during SSR (returns null)
export function createClientComponentClient(): SupabaseClient {
  // During SSR, return a minimal mock that won't throw
  if (typeof window === 'undefined') {
    // Return a proxy that won't throw during SSR
    // Real client will be used after hydration
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

    // If we have valid values, create the client
    if (url && key && url !== 'https://placeholder.supabase.co') {
      return createBrowserClient(url, key)
    }

    // During build without env vars, return a mock
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
