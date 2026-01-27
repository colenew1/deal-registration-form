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

CRITICAL CONTEXT: These emails are ALWAYS forwarded by an internal Amplifai channel team member (@amplifai.com). The Amplifai employee is NOT the Partner/TA - they are just forwarding the email. You must look INSIDE the forwarded content to find the actual Partner/TA who originally sent the deal registration.

Look for forwarded email patterns like:
- "---------- Forwarded message ---------" (Gmail)
- "-----Original Message-----" (Outlook)
- "From: [Name] <email>" headers inside the body
- Email signatures at the bottom of forwarded content

Extract the following fields from the email. Return ONLY valid JSON with these exact field names:

{
  "ta_full_name": "Partner/TA contact's full name (the ORIGINAL sender in forwarded content, NOT the @amplifai.com forwarder)",
  "ta_email": "Partner/TA email address (look in forwarded From: header or signature, NOT @amplifai.com)",
  "ta_phone": "Partner/TA phone number (from signature in forwarded content)",
  "ta_company_name": "Partner/TA company name (from signature or email domain, e.g., TechPartners, CloudAdvisors)",

  "tsd_name": "TSD/Distributor name - MUST be one of: Avant, Telarus, Intelisys, Sandler Partners, AppSmart, TBI, Bridgepointe, or Other",
  "tsd_contact_name": "TSD contact's full name (if mentioned)",
  "tsd_contact_email": "TSD contact's email (if mentioned)",

  "customer_first_name": "End customer contact's first name",
  "customer_last_name": "End customer contact's last name",
  "customer_company_name": "End customer's company name",
  "customer_email": "End customer's email address",
  "customer_phone": "End customer's phone number",
  "customer_job_title": "End customer's job title (VP, Manager, etc.)",
  "customer_street_address": "Street address",
  "customer_city": "City",
  "customer_state": "State/Province (2-letter code preferred)",
  "customer_postal_code": "ZIP/Postal code",
  "customer_country": "Country (default to USA if US address)",

  "agent_count": "Number of contact center agents (use ranges: 1-19, 20-49, 50-100, 101 to 249, 250 to 499, 500 to 999, 1000 to 2499, 2500 to 4999, 5000+)",
  "implementation_timeline": "Timeline (use: 0-3 months, 4-6 months, 6-12 months, 12+ months)",
  "solutions_interested": ["Array of solutions - ONLY if explicitly mentioned, empty array if none found"],
  "opportunity_description": "Brief description of the opportunity, use case, or pain points"
}

Important rules:
- IGNORE @amplifai.com addresses - these are internal staff who forwarded the email, NOT the Partner/TA
- The Partner/TA is the ORIGINAL sender found in the forwarded email content (From: header or signature)
- Look for forwarded message headers to find the original sender's name, email, and company
- Partner/TA company can often be extracted from their email domain or signature
- TSD is the distributor (Avant, Telarus, Intelisys, Sandler Partners, AppSmart, TBI, Bridgepointe)
- If a field cannot be found, use null
- For agent_count, convert numbers like "75 users" to the appropriate range ("50-100"). Numbers like "150-200" should become "101 to 249", "~800" should become "500 to 999", etc.
- Clean up email addresses and phone numbers (remove extra text)
- For solutions_interested, ONLY include solutions that are explicitly mentioned or clearly implied. Valid options are: Performance Management, Coaching, Conversation Intelligence & Analytics, Data Consolidation for CX, AutoQA / QA, Gamification. Use "Other" ONLY if a specific non-standard solution is explicitly mentioned. If no solutions are mentioned, return an empty array [].

Return ONLY the JSON object, no other text.`

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

    // Build the ParsedEmailData object
    const data: ParsedEmailData = {
      ta_full_name: parsed.ta_full_name as string | null,
      ta_email: parsed.ta_email as string | null,
      ta_phone: parsed.ta_phone as string | null,
      ta_company_name: parsed.ta_company_name as string | null,

      tsd_name: parsed.tsd_name as string | null,
      tsd_contact_name: parsed.tsd_contact_name as string | null,
      tsd_contact_email: parsed.tsd_contact_email as string | null,

      customer_first_name: parsed.customer_first_name as string | null,
      customer_last_name: parsed.customer_last_name as string | null,
      customer_company_name: parsed.customer_company_name as string | null,
      customer_email: parsed.customer_email as string | null,
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
