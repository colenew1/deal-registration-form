/**
 * AI-powered Email Parser using OpenAI
 *
 * This module uses GPT-4o-mini to extract structured deal registration
 * data from unstructured email content. It's more accurate than regex
 * for handling forwarded emails, varying formats, and messy text.
 */

import { ParsedEmailData, EmailParseResult, ConfidenceScores } from './email-parser'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Amplifai internal email domain - emails from this domain are forwarded by internal staff
const AMPLIFAI_DOMAIN = '@amplifai.com'

/**
 * System prompt for the AI parser
 */
const SYSTEM_PROMPT = `You are an expert at extracting structured data from business emails about deal registrations.

CRITICAL: These emails are ALWAYS forwarded by an internal Amplifai employee (@amplifai.com).
- ANY email address ending in @amplifai.com is INTERNAL STAFF - NEVER use these as Partner/TA or TSD contact
- The Partner/TA is the person who ORIGINALLY sent the email (found in forwarded headers)

HOW TO FIND THE PARTNER/TA:
1. Look for forwarded message markers: "---------- Forwarded message ---------", "-----Original Message-----", "From:", etc.
2. Inside the forwarded section, find "From: [Name] <email@domain.com>" - THIS is the Partner/TA
3. Their company name comes from their email domain (e.g., tbradley@channelpros.io → company is "Channel Pros" or "ChannelPros")
4. Look for their phone in signature blocks after their name

Example: If you see "From: Tom Bradley <tbradley@channelpros.io>", then:
- ta_full_name = "Tom Bradley"
- ta_email = "tbradley@channelpros.io"
- ta_company_name = "Channel Pros" (derived from domain)

Extract these fields. Return ONLY valid JSON:

{
  "ta_full_name": "Partner/TA name from forwarded From: header (NEVER @amplifai.com person)",
  "ta_email": "Partner/TA email from forwarded From: header (NEVER @amplifai.com)",
  "ta_phone": "Partner/TA phone from their signature",
  "ta_company_name": "Partner/TA company from signature or email domain",

  "tsd_name": "TSD name - one of: Avant, Telarus, Intelisys, Sandler Partners, AppSmart, TBI, Bridgepointe, Other",
  "tsd_contact_name": "TSD contact name (NEVER @amplifai.com person)",
  "tsd_contact_email": "TSD contact email (NEVER @amplifai.com)",

  "customer_first_name": "End customer first name",
  "customer_last_name": "End customer last name",
  "customer_company_name": "End customer company",
  "customer_email": "End customer email",
  "customer_phone": "End customer phone",
  "customer_job_title": "End customer job title",
  "customer_street_address": "Street address",
  "customer_city": "City",
  "customer_state": "State (2-letter)",
  "customer_postal_code": "ZIP code",
  "customer_country": "Country",

  "agent_count": "Use ranges: 1-19, 20-49, 50-100, 101 to 249, 250 to 499, 500 to 999, 1000 to 2499, 2500 to 4999, 5000+",
  "implementation_timeline": "Use: 0-3 months, 4-6 months, 6-12 months, 12+ months",
  "solutions_interested": ["Array of: Performance Management, Coaching, Conversation Intelligence & Analytics, Data Consolidation for CX, AutoQA / QA, Gamification"],
  "opportunity_description": "Brief description"
}

ABSOLUTE RULES:
1. NEVER put @amplifai.com emails in ta_email, tsd_contact_email, or customer_email - these are internal
2. The Partner/TA is ALWAYS in the forwarded content, not the outer email sender
3. If you can't find non-@amplifai.com Partner/TA info, return null for those fields
4. Convert agent counts: "~2000" → "1000 to 2499", "300 seats" → "250 to 499"
5. Solutions must match exactly from the list above

Return ONLY the JSON object.`

/**
 * Parse email using OpenAI GPT-4o-mini
 */
export async function parseEmailWithAI(
  emailBody: string,
  emailFrom?: string,
  emailFromName?: string,
  emailSubject?: string
): Promise<EmailParseResult | null> {
  if (!OPENAI_API_KEY) {
    console.log('OpenAI API key not configured, falling back to regex parser')
    return null
  }

  try {
    // Check if sender is from Amplifai (internal forwarder)
    const isAmplifaiForwarder = emailFrom?.toLowerCase().includes(AMPLIFAI_DOMAIN.toLowerCase()) || false

    // Build the user prompt with all available context
    let userPrompt = ''
    if (emailFromName || emailFrom) {
      userPrompt += `From: ${emailFromName || ''} <${emailFrom || ''}>\n`
      if (isAmplifaiForwarder) {
        userPrompt += `[NOTE: This is an INTERNAL Amplifai employee forwarding the email. Look for the ORIGINAL sender in the forwarded content below - that person is the Partner/TA.]\n`
      }
    }
    if (emailSubject) {
      userPrompt += `Subject: ${emailSubject}\n`
    }
    userPrompt += `\nEmail Body:\n${emailBody}`

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return null
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    if (!content) {
      console.error('No content in OpenAI response')
      return null
    }

    // Parse the JSON response
    let parsed: Record<string, unknown>
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(cleanContent)
    } catch (e) {
      console.error('Failed to parse OpenAI JSON response:', content)
      return null
    }

    // Helper to check if email is internal Amplifai
    const isInternalEmail = (email: string | null | undefined): boolean => {
      return !!email && email.toLowerCase().includes('@amplifai.com')
    }

    // Helper to clear field if it contains internal email
    const filterInternalEmail = (email: string | null | undefined): string | null => {
      return isInternalEmail(email) ? null : (email as string | null)
    }

    // Build the ParsedEmailData object with internal email filtering
    const data: ParsedEmailData = {
      // Filter out @amplifai.com from TA fields
      ta_full_name: isInternalEmail(parsed.ta_email as string) ? null : (parsed.ta_full_name as string | null),
      ta_email: filterInternalEmail(parsed.ta_email as string),
      ta_phone: isInternalEmail(parsed.ta_email as string) ? null : (parsed.ta_phone as string | null),
      ta_company_name: isInternalEmail(parsed.ta_email as string) ? null : (parsed.ta_company_name as string | null),

      tsd_name: parsed.tsd_name as string | null,
      // Filter out @amplifai.com from TSD contact fields
      tsd_contact_name: isInternalEmail(parsed.tsd_contact_email as string) ? null : (parsed.tsd_contact_name as string | null),
      tsd_contact_email: filterInternalEmail(parsed.tsd_contact_email as string),

      customer_first_name: parsed.customer_first_name as string | null,
      customer_last_name: parsed.customer_last_name as string | null,
      customer_company_name: parsed.customer_company_name as string | null,
      // Filter out @amplifai.com from customer email (shouldn't happen but just in case)
      customer_email: filterInternalEmail(parsed.customer_email as string),
      customer_phone: parsed.customer_phone as string | null,
      customer_job_title: parsed.customer_job_title as string | null,
      customer_street_address: parsed.customer_street_address as string | null,
      customer_city: parsed.customer_city as string | null,
      customer_state: parsed.customer_state as string | null,
      customer_postal_code: parsed.customer_postal_code as string | null,
      customer_country: parsed.customer_country as string | null,

      agent_count: parsed.agent_count as string | null,
      implementation_timeline: parsed.implementation_timeline as string | null,
      solutions_interested: Array.isArray(parsed.solutions_interested) ? parsed.solutions_interested : [],
      opportunity_description: parsed.opportunity_description as string | null,
      deal_value: null, // AI doesn't extract this currently
    }

    // Build confidence scores (AI extraction is generally high confidence)
    const confidence: ConfidenceScores = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)) {
        confidence[key] = 95 // High confidence for AI-extracted fields
      }
    }

    const warnings: string[] = []

    // Add warnings for missing critical fields
    if (!data.customer_company_name) {
      warnings.push('Could not extract customer company name')
    }
    if (!data.customer_email) {
      warnings.push('Could not extract customer email')
    }
    if (!data.ta_full_name && !data.ta_email) {
      warnings.push('Could not extract partner/TA information')
    }

    return {
      data,
      confidence,
      rawText: emailBody,
      warnings,
    }

  } catch (error) {
    console.error('AI parsing error:', error)
    return null
  }
}

/**
 * Check if AI parsing is available
 */
export function isAIParsingAvailable(): boolean {
  return !!OPENAI_API_KEY
}
