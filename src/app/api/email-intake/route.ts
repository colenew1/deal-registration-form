/**
 * Email Intake Webhook API Endpoint
 *
 * This endpoint receives forwarded emails from Zapier and:
 * 1. Parses the email content to extract deal information
 * 2. Stores the parsed data in Supabase
 * 3. Returns a pre-filled form URL
 *
 * ============================================================================
 * ZAPIER SETUP INSTRUCTIONS
 * ============================================================================
 *
 * 1. CREATE A NEW ZAP:
 *    Trigger: Email by Zapier (or Gmail, Outlook, etc.)
 *    - Set up an email address like deals@yourzapiermail.com
 *    - Or use Gmail trigger to watch a specific label/folder
 *
 * 2. CONFIGURE THE WEBHOOK ACTION:
 *    Action: Webhooks by Zapier > POST
 *
 *    URL: https://your-domain.com/api/email-intake
 *
 *    Payload Type: JSON
 *
 *    Data (map these fields from your email trigger):
 *    {
 *      "from_email": "{{from_email}}",
 *      "from_name": "{{from_name}}",
 *      "to_email": "{{to_email}}",
 *      "subject": "{{subject}}",
 *      "body_plain": "{{body_plain}}",
 *      "body_html": "{{body_html}}",
 *      "date": "{{date}}",
 *      "message_id": "{{message_id}}"
 *    }
 *
 * 3. (OPTIONAL) ADD A RESPONSE ACTION:
 *    You can add another action to:
 *    - Send a Slack notification with the pre-fill URL
 *    - Send an email to the sales team with the link
 *    - Create a task in your project management tool
 *
 * 4. SECURITY CONSIDERATIONS:
 *    - Consider adding a secret token in the request headers
 *    - Set up CORS properly in production
 *    - Add rate limiting if needed
 *
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase-server'
import { parseEmail } from '@/lib/email-parser'
import { parseEmailWithAI, isAIParsingAvailable } from '@/lib/ai-email-parser'

// Optional: Add a secret token for basic security
// Set this in your environment variables and configure in Zapier
const WEBHOOK_SECRET = process.env.EMAIL_INTAKE_WEBHOOK_SECRET

// Define the expected payload structure from Zapier
interface ZapierEmailPayload {
  // Email sender info
  from_email?: string
  from_name?: string
  from?: string // Some email triggers use 'from' instead

  // Email recipient info
  to_email?: string
  to?: string

  // Email content
  subject?: string
  body_plain?: string
  body_text?: string // Alternative field name
  body_html?: string
  body?: string // Some triggers just use 'body'

  // Metadata
  date?: string
  message_id?: string

  // Allow additional fields
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  try {
    // Optional: Verify webhook secret
    if (WEBHOOK_SECRET) {
      const authHeader = request.headers.get('Authorization')
      const providedSecret = authHeader?.replace('Bearer ', '')

      if (providedSecret !== WEBHOOK_SECRET) {
        console.warn('Email intake webhook: Invalid or missing secret')
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Parse the incoming payload
    const payload: ZapierEmailPayload = await request.json()

    // Normalize field names (different email providers use different names)
    const fromEmail = payload.from_email || payload.from || ''
    const fromName = payload.from_name || ''
    const toEmail = payload.to_email || payload.to || ''
    const subject = payload.subject || ''
    const bodyPlain = payload.body_plain || payload.body_text || payload.body || ''
    const bodyHtml = payload.body_html || ''
    const emailDate = payload.date ? new Date(payload.date).toISOString() : new Date().toISOString()
    const messageId = payload.message_id || ''

    // Validate that we have at least some content
    if (!bodyPlain && !bodyHtml) {
      return NextResponse.json(
        { error: 'Email body is required' },
        { status: 400 }
      )
    }

    // Parse the email content using AI
    const emailContent = bodyPlain || bodyHtml
    let parseResult = await parseEmailWithAI(emailContent, fromEmail, fromName, subject)
    let parsingMethod = 'ai'

    // If AI fails, store the email with empty fields so admin can fill in manually
    if (!parseResult) {
      parsingMethod = 'failed'
      console.log('AI parser failed — storing email with empty fields for manual review')
      parseResult = {
        data: {
          ta_full_name: null,
          ta_email: null,
          ta_phone: null,
          ta_company_name: null,
          tsd_name: null,
          tsd_contact_name: null,
          tsd_contact_email: null,
          customer_first_name: null,
          customer_last_name: null,
          customer_company_name: null,
          customer_email: null,
          customer_phone: null,
          customer_job_title: null,
          customer_street_address: null,
          customer_city: null,
          customer_state: null,
          customer_postal_code: null,
          customer_country: null,
          agent_count: null,
          implementation_timeline: null,
          solutions_interested: [],
          opportunity_description: null,
          deal_value: null,
        },
        confidence: {},
        warnings: ['AI parsing failed — manual review required'],
        rawText: emailContent || '',
      }
    } else {
      console.log('Using AI parser')
    }

    // Prepare the data for Supabase
    const intakeData = {
      // Original email data
      email_from: fromEmail,
      email_from_name: fromName,
      email_to: toEmail,
      email_subject: subject,
      email_body_plain: bodyPlain,
      email_body_html: bodyHtml,
      email_date: emailDate,
      email_message_id: messageId,

      // Raw payload for debugging
      raw_payload: payload,

      // Full parsed data as JSON
      parsed_data: {
        ...parseResult.data,
        warnings: parseResult.warnings,
        rawText: parseResult.rawText.substring(0, 5000) // Limit stored raw text
      },

      // Individual extracted fields (denormalized for easy querying)
      extracted_ta_full_name: parseResult.data.ta_full_name,
      extracted_ta_email: parseResult.data.ta_email,
      extracted_ta_phone: parseResult.data.ta_phone,
      extracted_ta_company_name: parseResult.data.ta_company_name,

      extracted_tsd_name: parseResult.data.tsd_name,
      extracted_tsd_contact_name: parseResult.data.tsd_contact_name,
      extracted_tsd_contact_email: parseResult.data.tsd_contact_email,

      extracted_customer_first_name: parseResult.data.customer_first_name,
      extracted_customer_last_name: parseResult.data.customer_last_name,
      extracted_customer_company_name: parseResult.data.customer_company_name,
      extracted_customer_email: parseResult.data.customer_email,
      extracted_customer_phone: parseResult.data.customer_phone,
      extracted_customer_job_title: parseResult.data.customer_job_title,
      extracted_customer_street_address: parseResult.data.customer_street_address,
      extracted_customer_city: parseResult.data.customer_city,
      extracted_customer_state: parseResult.data.customer_state,
      extracted_customer_postal_code: parseResult.data.customer_postal_code,
      extracted_customer_country: parseResult.data.customer_country,

      extracted_agent_count: parseResult.data.agent_count,
      extracted_implementation_timeline: parseResult.data.implementation_timeline,
      extracted_solutions_interested: parseResult.data.solutions_interested.length > 0
        ? parseResult.data.solutions_interested
        : null,
      extracted_opportunity_description: parseResult.data.opportunity_description,
      extracted_deal_value: parseResult.data.deal_value,

      // Confidence scores
      confidence_scores: parseResult.confidence,

      // Status
      status: 'pending'
    }

    // Insert into Supabase
    const supabase = createApiClient()
    const { data, error } = await supabase
      .from('email_intakes')
      .insert([intakeData])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save email intake', details: error.message },
        { status: 500 }
      )
    }

    // Generate URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'https://partner.amplifai.com'
    const prefillUrl = `${baseUrl}/register/${data.id}`
    const adminReviewUrl = `${baseUrl}/admin/intakes?id=${data.id}`

    // Return success response with URLs
    return NextResponse.json({
      success: true,
      message: 'Email intake processed successfully',
      parsing_method: parsingMethod,
      intake_id: data.id,
      prefill_url: prefillUrl,
      admin_review_url: adminReviewUrl,
      extracted_data: {
        customer_company: parseResult.data.customer_company_name,
        customer_email: parseResult.data.customer_email,
        partner: parseResult.data.ta_full_name,
        tsd: parseResult.data.tsd_name
      },
      warnings: parseResult.warnings,
      confidence_summary: {
        high_confidence_fields: Object.entries(parseResult.confidence)
          .filter(([, score]) => score >= 70)
          .map(([field]) => field),
        low_confidence_fields: Object.entries(parseResult.confidence)
          .filter(([, score]) => score > 0 && score < 70)
          .map(([field]) => field),
        missing_fields: Object.entries(parseResult.data)
          .filter(([key, value]) => {
            if (key === 'solutions_interested') return (value as string[]).length === 0
            return value === null || value === ''
          })
          .map(([field]) => field)
      }
    }, { status: 201 })

  } catch (err) {
    console.error('Email intake API error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for testing and health checks
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/email-intake',
    method: 'POST',
    description: 'Email intake webhook for Zapier integration',
    required_fields: ['body_plain or body_html'],
    optional_fields: ['from_email', 'from_name', 'subject', 'date', 'message_id'],
    returns: {
      intake_id: 'UUID of the created intake record',
      prefill_url: 'URL to the pre-filled registration form',
      extracted_data: 'Summary of extracted fields',
      warnings: 'Array of parsing warnings'
    }
  })
}
