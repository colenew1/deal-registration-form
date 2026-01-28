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
- The Partner/TA is the reseller or VAR who owns the customer relationship
- The TSD (Technology Services Distributor) is the distribution layer (e.g. Avant, Telarus, Intelisys, etc.)

KNOWN TSD DOMAINS — if the sender's email matches one of these, they are a TSD contact, NOT the Partner/TA:
- @goavant.net, @goavant.com → Avant
- @telarus.com → Telarus
- @intelisys.com → Intelisys
- @sandlerpartners.com → Sandler Partners
- @appsmart.com → AppSmart
- @tbicom.com → TBI
- @bridgepointetech.com → Bridgepointe

MULTI-FORWARD CHAINS - READ CAREFULLY:
Emails may be forwarded multiple times before reaching Amplifai. Example chains:

PATTERN 1 — TSD rep forwards from a Partner:
  Jessica (Partner/TA) → Marcus (TSD contact) → Sarah (@amplifai.com)
- Jessica is the PARTNER/TA (she has the customer details)
- Marcus is the TSD CONTACT (he just forwarded it)

PATTERN 2 — TSD rep submits registration on behalf of a Partner:
  Emely (TSD registration specialist) → Gwen (@amplifai.com)
  Email body says: "Partner Info: SHI, Mallory Santucci, mallory@shi.com"
- Emely is the TSD CONTACT (she works at a known TSD like Avant)
- SHI/Mallory is the PARTNER/TA (explicitly labeled as "Partner" in the email)
- The TSD name is "Avant" (from Emely's domain @goavant.net)

HOW TO IDENTIFY THE PARTNER/TA vs TSD CONTACT:
1. FIRST, check if the email explicitly labels "Partner Info", "Partner:", "Our Partner", "Reseller", or "VAR" — if so, THAT is the Partner/TA regardless of who sent the email
2. Check sender domains against the known TSD domain list above — if the sender is from a TSD domain, they are the TSD contact, NOT the Partner/TA
3. If someone says "please reach out to our partner" or "refer to our partner", they are TSD, not the TA
4. In multi-forward chains without explicit labels, trace back to the earliest non-TSD, non-Amplifai sender with customer details — that is the Partner/TA
5. The TSD CONTACT might be:
   - A sender from a known TSD domain
   - An intermediary who forwarded with phrases like "passing this along", "from one of my partners"
   - Someone with a title like "Registration Specialist", "Channel Manager" at a TSD
   - If TA mentions their TSD rep, that person is the TSD contact

EXAMPLE 1 - Double Forward (Partner is original sender):
"""
---------- Forwarded message ---------
From: Marcus Webb <marcus@telarus.com>
Hey Sarah, passing this along from one of my partners.

---------- Forwarded message ---------
From: Jessica Hernandez <jhernandez@nexgenpartners.net>
Customer: Derek Foster, VP...
Company: Pinnacle Retail Group
[customer details]

Thanks,
Jessica Hernandez
NexGen Partners
"""

Result:
- ta_full_name = "Jessica Hernandez" (she has the customer info, original sender)
- ta_email = "jhernandez@nexgenpartners.net"
- ta_company_name = "NexGen Partners"
- tsd_name = "Telarus" (Marcus's domain @telarus.com)
- tsd_contact_name = "Marcus Webb" (he forwarded from the TA)
- tsd_contact_email = "marcus@telarus.com"

EXAMPLE 2 - TSD rep registers on behalf of Partner:
"""
From: Emely Irula <eirula@goavant.net>
Please assist in registering the below opportunity.

Partner Info:
SHI
Mallory Santucci
mallory_santucci@shi.com

Customer Company Info:
SMSC Gaming Enterprise
[customer details]
"""

Result:
- ta_full_name = "Mallory Santucci" (explicitly labeled as Partner)
- ta_email = "mallory_santucci@shi.com"
- ta_company_name = "SHI"
- tsd_name = "Avant" (Emely's domain @goavant.net)
- tsd_contact_name = "Emely Irula" (she is the TSD registration specialist)
- tsd_contact_email = "eirula@goavant.net"

Extract these fields. Return ONLY valid JSON:

{
  "ta_full_name": "Partner/TA - the ORIGINAL sender with customer info (NEVER @amplifai.com)",
  "ta_email": "Partner/TA email (NEVER @amplifai.com)",
  "ta_phone": "Partner/TA phone from their signature",
  "ta_company_name": "Partner/TA company from signature or email domain",

  "tsd_name": "TSD name - one of: Avant, Telarus, Intelisys, Sandler Partners, AppSmart, TBI, Bridgepointe, Other. Use 'Other' ONLY if a TSD is clearly mentioned but doesn't match the list. If no TSD is mentioned or identifiable, return null.",
  "tsd_contact_name": "TSD contact - may be intermediary forwarder OR mentioned by TA (NEVER @amplifai.com)",
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
2. If the email explicitly labels someone as "Partner" or "Partner Info", THAT is the Partner/TA — even if someone else sent the email
3. If the sender's domain is a known TSD domain (goavant.net, telarus.com, etc.), they are the TSD contact, NOT the Partner/TA
4. If someone says "reach out to our partner", "passing along from my partner", or similar, they are TSD, not the TA
5. If you can't find non-@amplifai.com Partner/TA info, return null for those fields
6. Convert agent counts: "~2000" → "1000 to 2499", "300 seats" → "250 to 499"
7. Solutions must match exactly from the list above
8. For tsd_name, do NOT default to "Other" when no TSD is mentioned — return null instead. Only use "Other" when the email explicitly names a TSD that isn't in the known list

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
