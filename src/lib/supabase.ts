import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create client only if we have the required env vars
let supabaseInstance: SupabaseClient | null = null

export const getSupabase = () => {
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
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
}

export type AccountExecutive = {
  id: string
  name: string
  email: string
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
