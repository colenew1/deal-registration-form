/**
 * Email Parser for Deal Registration Intake
 *
 * This module extracts deal registration information from forwarded emails.
 * It handles various email formats and uses pattern matching to identify
 * common business data fields.
 *
 * The parser is designed to be flexible and handles:
 * - Forwarded emails with various formats (Gmail, Outlook, etc.)
 * - Email threads with multiple messages
 * - Inconsistent labeling and formatting
 * - Missing or partial information
 */

export interface ParsedEmailData {
  // Partner/TA Information
  ta_full_name: string | null
  ta_email: string | null
  ta_phone: string | null
  ta_company_name: string | null

  // TSD Information
  tsd_name: string | null
  tsd_contact_name: string | null
  tsd_contact_email: string | null

  // Customer Information
  customer_first_name: string | null
  customer_last_name: string | null
  customer_company_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_job_title: string | null
  customer_street_address: string | null
  customer_city: string | null
  customer_state: string | null
  customer_postal_code: string | null
  customer_country: string | null

  // Opportunity Details
  agent_count: string | null
  implementation_timeline: string | null
  solutions_interested: string[]
  opportunity_description: string | null
  deal_value: string | null
}

export interface ConfidenceScores {
  [key: string]: number // 0-100 confidence score
}

export interface EmailParseResult {
  data: ParsedEmailData
  confidence: ConfidenceScores
  rawText: string
  warnings: string[]
}

// Known TSD/Partner names for fuzzy matching
const KNOWN_TSDS = [
  'Avant', 'Telarus', 'Intelisys', 'Sandler Partners', 'AppSmart',
  'TBI', 'Bridgepointe', 'Telcorp', 'PlanetOne', 'Jenne'
]

// Known solution keywords
const SOLUTION_KEYWORDS = {
  'Performance Management': ['performance management', 'performance', 'kpi', 'metrics', 'dashboards'],
  'Coaching': ['coaching', 'coach', 'training', 'development'],
  'Conversation Intelligence & Analytics': ['conversation intelligence', 'speech analytics', 'call analytics', 'analytics', 'transcription'],
  'Data Consolidation for CX': ['data consolidation', 'cx data', 'customer experience', 'unified data'],
  'AutoQA / QA': ['autoqa', 'auto qa', 'quality assurance', 'qa scoring', 'quality management'],
  'Gamification': ['gamification', 'gamify', 'leaderboard', 'contests', 'rewards'],
}

// Timeline patterns
const TIMELINE_PATTERNS = [
  { pattern: /0[-\s]?3\s*months?|within\s*3\s*months?|immediate|asap|urgent/i, value: '0-3 months' },
  { pattern: /4[-\s]?6\s*months?|q[12]/i, value: '4-6 months' },
  { pattern: /6[-\s]?12\s*months?|next\s*year|h[12]/i, value: '6-12 months' },
  { pattern: /12\+?\s*months?|over\s*a?\s*year|long[\s-]?term/i, value: '12+ months' },
]

// Agent count patterns
const AGENT_COUNT_PATTERNS = [
  { pattern: /\b(1[-\s]?19|under\s*20|fewer\s*than\s*20)\s*(agents?|seats?|reps?)?/i, value: '1-19' },
  { pattern: /\b(20[-\s]?49|20\s*to\s*49)\s*(agents?|seats?|reps?)?/i, value: '20-49' },
  { pattern: /\b(50[-\s]?100|50\s*to\s*100)\s*(agents?|seats?|reps?)?/i, value: '50-100' },
  { pattern: /\b(101[-\s]?249|100[-\s]?250|101\s*to\s*249)\s*(agents?|seats?|reps?)?/i, value: '101 to 249' },
  { pattern: /\b(250[-\s]?499|250\s*to\s*499)\s*(agents?|seats?|reps?)?/i, value: '250 to 499' },
  { pattern: /\b(500[-\s]?999|500\s*to\s*999)\s*(agents?|seats?|reps?)?/i, value: '500 to 999' },
  { pattern: /\b(1000[-\s]?2499|1k[-\s]?2\.5k)\s*(agents?|seats?|reps?)?/i, value: '1000 to 2499' },
  { pattern: /\b(2500[-\s]?4999|2\.5k[-\s]?5k)\s*(agents?|seats?|reps?)?/i, value: '2500 to 4999' },
  { pattern: /\b(5000\+?|5k\+?|over\s*5000)\s*(agents?|seats?|reps?)?/i, value: '5000+' },
]

/**
 * Extract email addresses from text
 */
function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  return [...new Set(text.match(emailRegex) || [])]
}

/**
 * Extract phone numbers from text
 */
function extractPhones(text: string): string[] {
  // Match various phone formats
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g
  const matches = text.match(phoneRegex) || []
  return [...new Set(matches.map(p => p.trim()))]
}

/**
 * Extract names from common patterns
 */
function extractName(text: string, contextPattern: RegExp): { firstName: string | null, lastName: string | null, fullName: string | null } {
  const match = text.match(contextPattern)
  if (match && match[1]) {
    const nameParts = match[1].trim().split(/\s+/)
    if (nameParts.length >= 2) {
      return {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        fullName: match[1].trim()
      }
    } else if (nameParts.length === 1) {
      return {
        firstName: nameParts[0],
        lastName: null,
        fullName: nameParts[0]
      }
    }
  }
  return { firstName: null, lastName: null, fullName: null }
}

/**
 * Extract company name from text using various patterns
 */
function extractCompanyName(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  return null
}

/**
 * Extract value near a label (e.g., "Company: Acme Corp")
 */
function extractLabeledValue(text: string, labels: string[]): string | null {
  for (const label of labels) {
    // Try "Label: Value" format
    const colonPattern = new RegExp(`${label}\\s*[:\\-]\\s*([^\\n\\r]+)`, 'i')
    const colonMatch = text.match(colonPattern)
    if (colonMatch && colonMatch[1]) {
      return colonMatch[1].trim()
    }
  }
  return null
}

/**
 * Find the best matching TSD name
 */
function findTsdName(text: string): { name: string | null, confidence: number } {
  const lowerText = text.toLowerCase()

  for (const tsd of KNOWN_TSDS) {
    if (lowerText.includes(tsd.toLowerCase())) {
      return { name: tsd, confidence: 90 }
    }
  }

  // Try to extract from labeled field
  const extracted = extractLabeledValue(text, ['TSD', 'Distributor', 'Distribution Partner'])
  if (extracted) {
    return { name: extracted, confidence: 70 }
  }

  return { name: null, confidence: 0 }
}

/**
 * Extract solutions of interest based on keywords
 */
function extractSolutions(text: string): { solutions: string[], confidence: number } {
  const lowerText = text.toLowerCase()
  const foundSolutions: string[] = []

  for (const [solution, keywords] of Object.entries(SOLUTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        if (!foundSolutions.includes(solution)) {
          foundSolutions.push(solution)
        }
        break
      }
    }
  }

  return {
    solutions: foundSolutions,
    confidence: foundSolutions.length > 0 ? 60 : 0
  }
}

/**
 * Extract agent count from text
 */
function extractAgentCount(text: string): { value: string | null, confidence: number } {
  // First try labeled fields
  const agentLabels = ['agents', 'seats', 'agent count', 'number of agents', 'team size', 'contact center size']
  const labeled = extractLabeledValue(text, agentLabels)

  if (labeled) {
    // Try to match to our predefined ranges
    for (const { pattern, value } of AGENT_COUNT_PATTERNS) {
      if (pattern.test(labeled)) {
        return { value, confidence: 85 }
      }
    }

    // Try to parse a number directly
    const numMatch = labeled.match(/(\d+)/g)
    if (numMatch) {
      const num = parseInt(numMatch[0])
      if (num < 20) return { value: '1-19', confidence: 75 }
      if (num < 50) return { value: '20-49', confidence: 75 }
      if (num <= 100) return { value: '50-100', confidence: 75 }
      if (num < 250) return { value: '101 to 249', confidence: 75 }
      if (num < 500) return { value: '250 to 499', confidence: 75 }
      if (num < 1000) return { value: '500 to 999', confidence: 75 }
      if (num < 2500) return { value: '1000 to 2499', confidence: 75 }
      if (num < 5000) return { value: '2500 to 4999', confidence: 75 }
      return { value: '5000+', confidence: 75 }
    }
  }

  // Search the whole text for patterns
  for (const { pattern, value } of AGENT_COUNT_PATTERNS) {
    if (pattern.test(text)) {
      return { value, confidence: 65 }
    }
  }

  return { value: null, confidence: 0 }
}

/**
 * Extract implementation timeline
 */
function extractTimeline(text: string): { value: string | null, confidence: number } {
  const timelineLabels = ['timeline', 'timeframe', 'implementation', 'expected start', 'go live', 'target date']
  const labeled = extractLabeledValue(text, timelineLabels)

  const searchText = labeled || text

  for (const { pattern, value } of TIMELINE_PATTERNS) {
    if (pattern.test(searchText)) {
      return { value, confidence: labeled ? 80 : 60 }
    }
  }

  return { value: null, confidence: 0 }
}

/**
 * Extract deal/opportunity value
 */
function extractDealValue(text: string): { value: string | null, confidence: number } {
  const valueLabels = ['deal value', 'opportunity value', 'estimated value', 'arr', 'acv', 'budget', 'mrr']
  const labeled = extractLabeledValue(text, valueLabels)

  if (labeled) {
    return { value: labeled, confidence: 80 }
  }

  // Look for currency patterns
  const currencyPattern = /\$[\d,]+(?:\.\d{2})?(?:k|K|M)?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|dollars?)/g
  const matches = text.match(currencyPattern)
  if (matches && matches.length > 0) {
    return { value: matches[0], confidence: 50 }
  }

  return { value: null, confidence: 0 }
}

/**
 * Extract address components
 */
function extractAddress(text: string): {
  street: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  confidence: number
} {
  // Try labeled address
  const addressLabels = ['address', 'location', 'headquarters', 'hq']
  const labeled = extractLabeledValue(text, addressLabels)

  // US state abbreviations
  const statePattern = /\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/
  const stateMatch = text.match(statePattern)

  // Postal code pattern
  const postalMatch = text.match(/\b(\d{5}(?:-\d{4})?)\b/)

  // City, State pattern
  const cityStatePattern = /([A-Za-z\s]+),\s*([A-Z]{2})\b/
  const cityStateMatch = text.match(cityStatePattern)

  return {
    street: labeled || null,
    city: cityStateMatch ? cityStateMatch[1].trim() : null,
    state: stateMatch ? stateMatch[1] : (cityStateMatch ? cityStateMatch[2] : null),
    postalCode: postalMatch ? postalMatch[1] : null,
    country: text.toLowerCase().includes('usa') || text.toLowerCase().includes('united states') ? 'USA' : null,
    confidence: (stateMatch || cityStateMatch) ? 60 : 30
  }
}

/**
 * Clean and normalize email body text
 */
function cleanEmailText(text: string): string {
  if (!text) return ''

  // Remove HTML tags if present
  let cleaned = text.replace(/<[^>]*>/g, ' ')

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned
}

/**
 * Parse forwarded email to extract original sender info
 */
function parseForwardedEmail(text: string): {
  originalFrom: { name: string | null, email: string | null }
  originalSubject: string | null
  body: string
} {
  // Common forward patterns
  const forwardPatterns = [
    // Gmail forward
    /---------- Forwarded message ---------\s*From:\s*([^\n<]+?)(?:\s*<([^>]+)>)?\s*Date:.*?\s*Subject:\s*([^\n]+)/i,
    // Outlook forward
    /From:\s*([^\n<]+?)(?:\s*<([^>]+)>)?\s*Sent:.*?\s*To:.*?\s*Subject:\s*([^\n]+)/i,
    // Generic forward
    /From:\s*([^\n<]+?)(?:\s*<([^>]+)>)?[\s\S]*?Subject:\s*([^\n]+)/i,
  ]

  for (const pattern of forwardPatterns) {
    const match = text.match(pattern)
    if (match) {
      return {
        originalFrom: {
          name: match[1]?.trim() || null,
          email: match[2]?.trim() || null
        },
        originalSubject: match[3]?.trim() || null,
        body: text
      }
    }
  }

  return {
    originalFrom: { name: null, email: null },
    originalSubject: null,
    body: text
  }
}

/**
 * Main email parsing function
 * Takes raw email content and extracts deal registration fields
 */
export function parseEmail(
  emailBody: string,
  emailFrom?: string,
  emailFromName?: string,
  emailSubject?: string
): EmailParseResult {
  const warnings: string[] = []
  const confidence: ConfidenceScores = {}

  // Clean and prepare text
  const cleanedBody = cleanEmailText(emailBody)
  const forwardedInfo = parseForwardedEmail(cleanedBody)
  const searchText = cleanedBody

  // Extract all emails and phones from the body
  const allEmails = extractEmails(searchText)
  const allPhones = extractPhones(searchText)

  // Initialize parsed data
  const data: ParsedEmailData = {
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
    deal_value: null
  }

  // --- Extract Partner/TA Information ---
  // The person forwarding the email is often the TA
  if (emailFromName) {
    const nameParts = emailFromName.trim().split(/\s+/)
    if (nameParts.length >= 2) {
      data.ta_full_name = emailFromName.trim()
      confidence.ta_full_name = 85
    }
  }

  if (emailFrom) {
    data.ta_email = emailFrom
    confidence.ta_email = 85

    // Try to extract company from email domain
    const domainMatch = emailFrom.match(/@([^.]+)/)
    if (domainMatch) {
      const domain = domainMatch[1]
      // Capitalize first letter
      const companyGuess = domain.charAt(0).toUpperCase() + domain.slice(1)
      if (!['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'aol'].includes(domain.toLowerCase())) {
        data.ta_company_name = companyGuess
        confidence.ta_company_name = 60
      }
    }
  }

  // Look for TA info in labeled fields
  const taNameLabeled = extractLabeledValue(searchText, ['partner name', 'ta name', 'advisor name', 'rep name', 'sales rep'])
  if (taNameLabeled) {
    data.ta_full_name = taNameLabeled
    confidence.ta_full_name = 75
  }

  const taCompanyLabeled = extractLabeledValue(searchText, ['partner company', 'ta company', 'partner', 'reseller'])
  if (taCompanyLabeled) {
    data.ta_company_name = taCompanyLabeled
    confidence.ta_company_name = 80
  }

  // Extract phones - first one often belongs to submitter
  if (allPhones.length > 0) {
    data.ta_phone = allPhones[0]
    confidence.ta_phone = 50
  }

  // --- Extract TSD Information ---
  const tsdResult = findTsdName(searchText)
  if (tsdResult.name) {
    data.tsd_name = tsdResult.name
    confidence.tsd_name = tsdResult.confidence
  }

  const tsdContactLabeled = extractLabeledValue(searchText, ['tsd contact', 'distributor contact', 'tsd rep'])
  if (tsdContactLabeled) {
    data.tsd_contact_name = tsdContactLabeled
    confidence.tsd_contact_name = 75
  }

  // --- Extract Customer Information ---
  // Look for customer/end-user/prospect patterns
  const customerCompanyLabels = [
    'customer', 'end user', 'end-user', 'prospect', 'client', 'company name',
    'organization', 'account', 'business name', 'opportunity'
  ]
  const customerCompanyLabeled = extractLabeledValue(searchText, customerCompanyLabels)
  if (customerCompanyLabeled) {
    data.customer_company_name = customerCompanyLabeled
    confidence.customer_company_name = 80
  }

  // Extract customer contact name
  const contactNameLabels = ['contact name', 'primary contact', 'decision maker', 'customer contact', 'poc']
  const contactNameLabeled = extractLabeledValue(searchText, contactNameLabels)
  if (contactNameLabeled) {
    const nameParts = contactNameLabeled.trim().split(/\s+/)
    if (nameParts.length >= 2) {
      data.customer_first_name = nameParts[0]
      data.customer_last_name = nameParts.slice(1).join(' ')
      confidence.customer_first_name = 75
      confidence.customer_last_name = 75
    } else if (nameParts.length === 1) {
      data.customer_first_name = nameParts[0]
      confidence.customer_first_name = 60
    }
  }

  // Extract customer job title
  const jobTitleLabels = ['title', 'job title', 'position', 'role']
  const jobTitleLabeled = extractLabeledValue(searchText, jobTitleLabels)
  if (jobTitleLabeled) {
    data.customer_job_title = jobTitleLabeled
    confidence.customer_job_title = 75
  }

  // Extract customer email - look for customer-related email
  const customerEmailLabels = ['customer email', 'contact email', 'email']
  const customerEmailLabeled = extractLabeledValue(searchText, customerEmailLabels)
  if (customerEmailLabeled && customerEmailLabeled.includes('@')) {
    data.customer_email = customerEmailLabeled
    confidence.customer_email = 80
  } else if (allEmails.length > 1) {
    // If we have multiple emails, the second one might be customer
    // (first is usually the person forwarding)
    data.customer_email = allEmails[1]
    confidence.customer_email = 40
  }

  // Extract customer phone
  const customerPhoneLabels = ['customer phone', 'contact phone', 'phone']
  const customerPhoneLabeled = extractLabeledValue(searchText, customerPhoneLabels)
  if (customerPhoneLabeled) {
    data.customer_phone = customerPhoneLabeled
    confidence.customer_phone = 75
  } else if (allPhones.length > 1) {
    data.customer_phone = allPhones[1]
    confidence.customer_phone = 35
  }

  // Extract address
  const address = extractAddress(searchText)
  if (address.street) {
    data.customer_street_address = address.street
    confidence.customer_street_address = address.confidence
  }
  if (address.city) {
    data.customer_city = address.city
    confidence.customer_city = address.confidence
  }
  if (address.state) {
    data.customer_state = address.state
    confidence.customer_state = address.confidence
  }
  if (address.postalCode) {
    data.customer_postal_code = address.postalCode
    confidence.customer_postal_code = address.confidence
  }
  if (address.country) {
    data.customer_country = address.country
    confidence.customer_country = address.confidence
  }

  // --- Extract Opportunity Details ---
  const agentCountResult = extractAgentCount(searchText)
  if (agentCountResult.value) {
    data.agent_count = agentCountResult.value
    confidence.agent_count = agentCountResult.confidence
  }

  const timelineResult = extractTimeline(searchText)
  if (timelineResult.value) {
    data.implementation_timeline = timelineResult.value
    confidence.implementation_timeline = timelineResult.confidence
  }

  const solutionsResult = extractSolutions(searchText)
  if (solutionsResult.solutions.length > 0) {
    data.solutions_interested = solutionsResult.solutions
    confidence.solutions_interested = solutionsResult.confidence
  }

  const dealValueResult = extractDealValue(searchText)
  if (dealValueResult.value) {
    data.deal_value = dealValueResult.value
    confidence.deal_value = dealValueResult.confidence
  }

  // Use the email body as opportunity description if no specific one found
  const descriptionLabels = ['description', 'details', 'notes', 'opportunity description', 'use case']
  const descriptionLabeled = extractLabeledValue(searchText, descriptionLabels)
  if (descriptionLabeled) {
    data.opportunity_description = descriptionLabeled
    confidence.opportunity_description = 70
  } else if (forwardedInfo.body && forwardedInfo.body.length > 50) {
    // Use a portion of the email body as description
    const truncated = forwardedInfo.body.substring(0, 500)
    data.opportunity_description = truncated + (forwardedInfo.body.length > 500 ? '...' : '')
    confidence.opportunity_description = 30
    warnings.push('Used email body as opportunity description - please review and edit')
  }

  // Add warnings for low confidence or missing critical fields
  if (!data.customer_company_name) {
    warnings.push('Could not extract customer company name')
  }
  if (!data.customer_email) {
    warnings.push('Could not extract customer email')
  }
  if (!data.tsd_name) {
    warnings.push('Could not identify TSD - please select manually')
  }

  return {
    data,
    confidence,
    rawText: cleanedBody,
    warnings
  }
}

/**
 * Merge parsed data with manual overrides
 * Manual values take precedence over parsed values
 */
export function mergeWithOverrides(
  parsed: ParsedEmailData,
  overrides: Partial<ParsedEmailData>
): ParsedEmailData {
  const result = { ...parsed }

  for (const [key, value] of Object.entries(overrides)) {
    if (value !== null && value !== undefined && value !== '') {
      (result as Record<string, unknown>)[key] = value
    }
  }

  return result
}
