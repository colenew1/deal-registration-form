import { createBrowserClient } from '@supabase/ssr'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Browser client (for client components)
export function createClientComponentClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Server client (for server components and route handlers)
export async function createServerComponentClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component - ignore (can't set cookies in RSC)
        }
      },
    },
  })
}

// Admin client (for server-side admin operations - uses service role key)
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Legacy compatibility - for existing code that uses getSupabase()
let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null

export const getSupabase = () => {
  if (typeof window === 'undefined') {
    throw new Error('getSupabase() should only be called on the client side. Use createServerComponentClient() for server components.')
  }
  if (!browserClientInstance && supabaseUrl && supabaseAnonKey) {
    browserClientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return browserClientInstance
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

// ============================================
// Types
// ============================================

export type UserProfile = {
  id: string
  created_at: string
  updated_at: string
  role: 'admin' | 'partner'
  full_name: string
  email: string
  company_name: string | null
  phone: string | null
  tsd_name: string | null
  legacy_partner_id: string | null
  is_active: boolean
}

export type DealRegistration = {
  id: string
  created_at: string
  updated_at: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_at: string | null
  rejection_reason: string | null
  assigned_ae_name: string | null
  assigned_ae_email: string | null
  customer_first_name: string
  customer_last_name: string
  customer_job_title: string | null
  customer_company_name: string
  customer_email: string
  customer_phone: string | null
  customer_street_address: string | null
  customer_city: string | null
  customer_state: string | null
  customer_postal_code: string | null
  customer_country: string | null
  agent_count: string | null
  implementation_timeline: string | null
  solutions_interested: string[] | null
  opportunity_description: string | null
  ta_full_name: string
  ta_email: string
  ta_phone: string | null
  ta_company_name: string
  tsd_name: string
  tsd_contact_name: string | null
  tsd_contact_email: string | null
  source: 'form' | 'email_import'
  original_email_content: string | null
  webhook_sent_at: string | null
  webhook_response: string | null
  partner_id: string | null
}

export type AccountExecutive = {
  id: string
  name: string
  email: string
}

export type Partner = {
  id: string
  created_at: string
  updated_at: string
  email: string
  password_hash: string
  full_name: string
  company_name: string
  phone: string | null
  is_active: boolean
  last_login_at: string | null
  tsd_name: string | null
  auth_user_id: string | null
}

/**
 * Email Intake record - stores parsed email data before conversion to registration
 */
export type EmailIntake = {
  id: string
  created_at: string
  updated_at: string
  status: 'pending' | 'reviewed' | 'converted' | 'discarded'
  converted_registration_id: string | null
  converted_at: string | null

  // Original email data
  email_from: string | null
  email_from_name: string | null
  email_to: string | null
  email_subject: string | null
  email_body_plain: string | null
  email_body_html: string | null
  email_date: string | null
  email_message_id: string | null

  // Raw payload and parsed data
  raw_payload: Record<string, unknown> | null
  parsed_data: {
    warnings?: string[]
    rawText?: string
    [key: string]: unknown
  } | null

  // Extracted fields
  extracted_ta_full_name: string | null
  extracted_ta_email: string | null
  extracted_ta_phone: string | null
  extracted_ta_company_name: string | null
  extracted_tsd_name: string | null
  extracted_tsd_contact_name: string | null
  extracted_tsd_contact_email: string | null
  extracted_customer_first_name: string | null
  extracted_customer_last_name: string | null
  extracted_customer_company_name: string | null
  extracted_customer_email: string | null
  extracted_customer_phone: string | null
  extracted_customer_job_title: string | null
  extracted_customer_street_address: string | null
  extracted_customer_city: string | null
  extracted_customer_state: string | null
  extracted_customer_postal_code: string | null
  extracted_customer_country: string | null
  extracted_agent_count: string | null
  extracted_implementation_timeline: string | null
  extracted_solutions_interested: string[] | null
  extracted_opportunity_description: string | null
  extracted_deal_value: string | null

  // Confidence scores
  confidence_scores: Record<string, number> | null

  // Review info
  review_notes: string | null
  reviewed_by: string | null
}
