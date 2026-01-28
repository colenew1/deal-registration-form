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

// Amplifai internal email domain - emails from this domain are forwarded by internal staff
const AMPLIFAI_DOMAIN = '@amplifai.com'

/**
 * Check if an email is from internal Amplifai staff
 */
function isInternalEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().includes(AMPLIFAI_DOMAIN.toLowerCase())
}

// Known TSD/Partner names for fuzzy matching
const KNOWN_TSDS = [
  'Avant', 'Telarus', 'Intelisys', 'Sandler Partners', 'AppSmart',
  'TBI', 'Bridgepointe', 'Telcorp', 'PlanetOne', 'Jenne'
]

// Known solution keywords
const SOLUTION_KEYWORDS = {
  'Performance Management': ['performance management', 'performance', 'kpi', 'metrics', 'dashboards', 'wfm', 'wfo', 'workforce management', 'workforce optimization'],
  'Coaching': ['coaching', 'coach', 'training', 'development', 'agent assist', 'real-time assist'],
  'Conversation Intelligence & Analytics': ['conversation intelligence', 'speech analytics', 'call analytics', 'analytics', 'transcription', 'call summarization', 'summarization', 'agentic ai', 'ai'],
  'Data Consolidation for CX': ['data consolidation', 'cx data', 'customer experience', 'unified data'],
  'AutoQA / QA': ['autoqa', 'auto qa', 'quality assurance', 'qa scoring', 'quality management'],
  'Gamification': ['gamification', 'gamify', 'leaderboard', 'contests', 'rewards'],
  'Other': ['language translation', 'translation', 'accent neutralization', 'accent reduction'],
}

// Timeline patterns
const TIMELINE_PATTERNS = [
  { pattern: /0[-\s]?3\s*months?|within\s*3\s*months?|immediate|asap|urgent/i, value: '0-3 months' },
  { pattern: /4[-\s]?6\s*months?|q[12]/i, value: '4-6 months' },
  { pattern: /6[-\s]?12\s*months?|next\s*year|h[12]/i, value: '6-12 months' },
  { pattern: /12\+?\s*months?|over\s*a?\s*year|long[\s-]?term/i, value: '12+ months' },
]

// Agent count patterns - also match standalone numbers followed by "users", "agents", etc.
const AGENT_COUNT_PATTERNS = [
  { pattern: /\b(1[-\s]?19|under\s*20|fewer\s*than\s*20)\s*(agents?|seats?|reps?|users?)?/i, value: '1-19' },
  { pattern: /\b(20[-\s]?49|20\s*to\s*49)\s*(agents?|seats?|reps?|users?)?/i, value: '20-49' },
  { pattern: /\b(50[-\s]?100|50\s*to\s*100)\s*(agents?|seats?|reps?|users?)?/i, value: '50-100' },
  { pattern: /\b(101[-\s]?249|100[-\s]?250|101\s*to\s*249)\s*(agents?|seats?|reps?|users?)?/i, value: '101 to 249' },
  { pattern: /\b(250[-\s]?499|250\s*to\s*499)\s*(agents?|seats?|reps?|users?)?/i, value: '250 to 499' },
  { pattern: /\b(500[-\s]?999|500\s*to\s*999)\s*(agents?|seats?|reps?|users?)?/i, value: '500 to 999' },
  { pattern: /\b(1000[-\s]?2499|1k[-\s]?2\.5k)\s*(agents?|seats?|reps?|users?)?/i, value: '1000 to 2499' },
  { pattern: /\b(2500[-\s]?4999|2\.5k[-\s]?5k)\s*(agents?|seats?|reps?|users?)?/i, value: '2500 to 4999' },
  { pattern: /\b(5000\+?|5k\+?|over\s*5000)\s*(agents?|seats?|reps?|users?)?/i, value: '5000+' },
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
 * Extract a multi-line section content (e.g., "Partner Info:" followed by lines until next section)
 * Returns array of non-empty lines in the section
 */
function extractSectionContent(text: string, sectionHeaders: string[]): string[] {
  for (const header of sectionHeaders) {
    // Match "Header:" or "Header Info:" followed by content until next header or double newline
    const pattern = new RegExp(
      `${header}(?:\\s*Info)?\\s*[:\\-]\\s*([\\s\\S]*?)(?=\\n\\s*(?:[A-Z][a-zA-Z\\s]+(?:Info)?\\s*[:\\-])|\\*|$)`,
      'i'
    )
    const match = text.match(pattern)
    if (match && match[1]) {
      // Split into lines, clean them, and filter empty lines
      const lines = match[1]
        .split(/[\n\r]+/)
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('*'))
      if (lines.length > 0) {
        return lines
      }
    }
  }
  return []
}

/**
 * Parse structured partner info section
 * Format: Company name, then contact name, then email
 */
function parsePartnerSection(lines: string[]): {
  companyName: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
} {
  let companyName: string | null = null
  let contactName: string | null = null
  let contactEmail: string | null = null
  let contactPhone: string | null = null

  for (const line of lines) {
    // Check if it's an email
    if (line.includes('@') && !contactEmail) {
      contactEmail = line
    }
    // Check if it's a phone number
    else if (/^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/.test(line.replace(/[()D.\s]/g, '')) || /^D\.\s*\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/.test(line)) {
      contactPhone = line.replace(/^D\.\s*/, '')
    }
    // Check if it looks like a name (contains letters, possibly with underscore)
    else if (/^[A-Za-z][a-zA-Z_\s]+$/.test(line) && line.includes(' ') || line.includes('_')) {
      contactName = line.replace(/_/g, ' ')
    }
    // First non-email, non-phone, non-name line is likely the company
    else if (!companyName && /^[A-Za-z]/.test(line)) {
      companyName = line
    }
  }

  return { companyName, contactName, contactEmail, contactPhone }
}

/**
 * Parse structured customer company section
 * Format: Company name, then address lines
 */
function parseCustomerCompanySection(lines: string[]): {
  companyName: string | null
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
} {
  let companyName: string | null = null
  let streetAddress: string | null = null
  let city: string | null = null
  let state: string | null = null
  let postalCode: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // First line is usually company name
    if (i === 0) {
      companyName = line
      continue
    }

    // Check for city, state ZIP pattern
    const cityStateZip = line.match(/^([A-Za-z\s]+),?\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/)
    if (cityStateZip) {
      city = cityStateZip[1].trim()
      state = cityStateZip[2]
      postalCode = cityStateZip[3]
      continue
    }

    // Otherwise it's part of the street address
    if (!streetAddress) {
      streetAddress = line
    } else {
      streetAddress += ', ' + line
    }
  }

  return { companyName, streetAddress, city, state, postalCode }
}

/**
 * Parse structured customer contact section
 * Format: Name, then title/email/phone on separate lines
 */
function parseCustomerContactSection(lines: string[]): {
  firstName: string | null
  lastName: string | null
  jobTitle: string | null
  email: string | null
  phone: string | null
} {
  let firstName: string | null = null
  let lastName: string | null = null
  let jobTitle: string | null = null
  let email: string | null = null
  let phone: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check if it's an email
    if (line.includes('@')) {
      email = line
      continue
    }

    // Check if it's a phone number
    if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(line)) {
      phone = line
      continue
    }

    // First line is usually the name
    if (i === 0 || (!firstName && /^[A-Za-z]+\s+[A-Za-z]+/.test(line))) {
      const nameParts = line.split(/\s+/)
      firstName = nameParts[0]
      lastName = nameParts.slice(1).join(' ') || null
      continue
    }

    // Check for job title keywords
    if (!jobTitle && /VP|Vice President|Director|Manager|CEO|CTO|CFO|COO|President|Owner/i.test(line)) {
      jobTitle = line
    }
  }

  return { firstName, lastName, jobTitle, email, phone }
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
 * Now enhanced to handle multiple forward patterns and extract company info
 */
function parseForwardedEmail(text: string): {
  originalFrom: { name: string | null, email: string | null, company: string | null, phone: string | null }
  originalSubject: string | null
  body: string
} {
  // Common forward patterns - ordered by specificity
  const forwardPatterns = [
    // Gmail forward
    /---------- Forwarded message ---------[\s\S]*?From:\s*([^\n<]+?)(?:\s*<([^>]+)>)?[\s\S]*?Date:[\s\S]*?Subject:\s*([^\n]+)/i,
    // Outlook forward with From/Sent/To/Subject
    /(?:-----Original Message-----|_{10,})[\s\S]*?From:\s*([^\n<]+?)(?:\s*<([^>]+)>)?[\s\S]*?Sent:[\s\S]*?To:[\s\S]*?Subject:\s*([^\n]+)/i,
    // Outlook forward (different format)
    /From:\s*([^\n<]+?)\s*\[mailto:([^\]]+)\][\s\S]*?Subject:\s*([^\n]+)/i,
    // Simple From: header in forwarded content (not at start of email)
    /(?:^|\n)From:\s*([^\n<]+?)(?:\s*<([^>]+)>)?\s*(?:Date|Sent):/im,
  ]

  let originalFrom: { name: string | null, email: string | null, company: string | null, phone: string | null } = {
    name: null,
    email: null,
    company: null,
    phone: null
  }
  let originalSubject: string | null = null

  for (const pattern of forwardPatterns) {
    const match = text.match(pattern)
    if (match) {
      const name = match[1]?.trim() || null
      const email = match[2]?.trim() || null
      originalSubject = match[3]?.trim() || null

      // Extract company from email domain
      let company: string | null = null
      if (email) {
        const domainMatch = email.match(/@([^.]+)/)
        if (domainMatch) {
          const domain = domainMatch[1].toLowerCase()
          // Skip common email providers
          if (!['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'aol', 'amplifai'].includes(domain)) {
            company = domain.charAt(0).toUpperCase() + domain.slice(1)
          }
        }
      }

      originalFrom = { name, email, company, phone: null }
      break
    }
  }

  // Try to extract phone from signature near the original sender
  // Look for phone patterns after the From: line in forwarded content
  if (originalFrom.name || originalFrom.email) {
    const phoneInForward = text.match(/(?:cell|mobile|phone|tel|d\.?)[:.]?\s*(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/i)
    if (phoneInForward) {
      originalFrom.phone = phoneInForward[1]
    }
  }

  // Also look for signature blocks that might have company name
  if (!originalFrom.company && originalFrom.name) {
    // Look for company name in signature (Name\nCompany Name pattern)
    const sigPattern = new RegExp(`${originalFrom.name.split(' ')[0]}[\\s\\S]{0,100}?\\n([A-Z][A-Za-z\\s&]+(?:Inc|LLC|Corp|Ltd|Partners|Consulting|Solutions|Advisors|Group)?)\\.?\\s*\\n`, 'i')
    const sigMatch = text.match(sigPattern)
    if (sigMatch) {
      originalFrom.company = sigMatch[1].trim()
    }
  }

  return {
    originalFrom,
    originalSubject,
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

  // --- Check if email sender is from Amplifai (internal forwarder) ---
  const senderIsAmplifai = emailFrom?.toLowerCase().includes(AMPLIFAI_DOMAIN.toLowerCase()) || false

  // --- Check if email sender is from a TSD (like Avant, Telarus, etc.) ---
  // If so, they're the TSD contact, not the Partner/TA
  let senderIsTsd = false
  if (emailFrom && !senderIsAmplifai) {
    const senderDomain = emailFrom.toLowerCase()
    // Common TSD domains
    const tsdDomains = ['goavant.net', 'avant.com', 'telarus.com', 'intelisys.com', 'sandlerpartners.com', 'appsmart.com', 'tbicom.com']
    senderIsTsd = tsdDomains.some(domain => senderDomain.includes(domain))
  }

  // --- Try to extract structured sections first (Avant format) ---
  const partnerSection = extractSectionContent(searchText, ['Partner', 'Partner Info'])
  const customerCompanySection = extractSectionContent(searchText, ['Customer Company', 'Customer Company Info', 'End User', 'End User Info'])
  const customerContactSection = extractSectionContent(searchText, ['Customer Contact', 'Customer Contact Info', 'Contact Info'])
  const opportunitySection = extractSectionContent(searchText, ['Opportunity', 'Opportunity Info', 'Opp Info', 'Opp'])

  // --- Extract Partner/TA Information ---
  // Priority: 1) Forwarded sender (if from Amplifai), 2) Structured partner section, 3) Email sender (if not TSD)

  // Check if the original forwarded sender is from a TSD domain
  let originalSenderIsTsd = false
  if (forwardedInfo.originalFrom.email) {
    const origDomain = forwardedInfo.originalFrom.email.toLowerCase()
    const tsdDomains = ['goavant.net', 'avant.com', 'telarus.com', 'intelisys.com', 'sandlerpartners.com', 'appsmart.com', 'tbicom.com']
    originalSenderIsTsd = tsdDomains.some(domain => origDomain.includes(domain))
  }

  // If original forwarded sender is from a TSD, use them as TSD contact instead of TA
  if (senderIsAmplifai && originalSenderIsTsd && (forwardedInfo.originalFrom.name || forwardedInfo.originalFrom.email)) {
    if (forwardedInfo.originalFrom.name) {
      data.tsd_contact_name = forwardedInfo.originalFrom.name
      confidence.tsd_contact_name = 90
    }
    if (forwardedInfo.originalFrom.email) {
      data.tsd_contact_email = forwardedInfo.originalFrom.email
      confidence.tsd_contact_email = 90
    }
  }

  // If email is from Amplifai and original sender is NOT a TSD, use them as TA
  if (senderIsAmplifai && !originalSenderIsTsd && (forwardedInfo.originalFrom.name || forwardedInfo.originalFrom.email)) {
    if (forwardedInfo.originalFrom.name) {
      data.ta_full_name = forwardedInfo.originalFrom.name
      confidence.ta_full_name = 90
    }
    if (forwardedInfo.originalFrom.email) {
      data.ta_email = forwardedInfo.originalFrom.email
      confidence.ta_email = 90
    }
    if (forwardedInfo.originalFrom.company) {
      data.ta_company_name = forwardedInfo.originalFrom.company
      confidence.ta_company_name = 75
    }
    if (forwardedInfo.originalFrom.phone) {
      data.ta_phone = forwardedInfo.originalFrom.phone
      confidence.ta_phone = 80
    }
  } else if (partnerSection.length > 0) {
    // Parse structured partner section
    const partnerInfo = parsePartnerSection(partnerSection)
    if (partnerInfo.companyName) {
      data.ta_company_name = partnerInfo.companyName
      confidence.ta_company_name = 90
    }
    if (partnerInfo.contactName) {
      data.ta_full_name = partnerInfo.contactName
      confidence.ta_full_name = 90
    }
    if (partnerInfo.contactEmail) {
      data.ta_email = partnerInfo.contactEmail
      confidence.ta_email = 90
    }
    if (partnerInfo.contactPhone) {
      data.ta_phone = partnerInfo.contactPhone
      confidence.ta_phone = 85
    }
  } else if (!senderIsTsd && !senderIsAmplifai) {
    // Fall back to using email sender as TA (only if sender is not from TSD or Amplifai)
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
        const companyGuess = domain.charAt(0).toUpperCase() + domain.slice(1)
        if (!['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'aol'].includes(domain.toLowerCase())) {
          data.ta_company_name = companyGuess
          confidence.ta_company_name = 60
        }
      }
    }
  }

  // Look for TA info in labeled fields (fallback)
  if (!data.ta_full_name) {
    const taNameLabeled = extractLabeledValue(searchText, ['partner name', 'ta name', 'advisor name', 'rep name', 'sales rep'])
    if (taNameLabeled) {
      data.ta_full_name = taNameLabeled
      confidence.ta_full_name = 75
    }
  }

  if (!data.ta_company_name) {
    const taCompanyLabeled = extractLabeledValue(searchText, ['partner company', 'ta company', 'partner', 'reseller'])
    if (taCompanyLabeled) {
      data.ta_company_name = taCompanyLabeled
      confidence.ta_company_name = 80
    }
  }

  // --- Extract TSD Information ---
  const tsdResult = findTsdName(searchText)
  if (tsdResult.name) {
    data.tsd_name = tsdResult.name
    confidence.tsd_name = tsdResult.confidence
  }

  // If email sender is from TSD, use them as TSD contact
  if (senderIsTsd) {
    if (emailFromName) {
      data.tsd_contact_name = emailFromName.trim()
      confidence.tsd_contact_name = 90
    }
    if (emailFrom) {
      data.tsd_contact_email = emailFrom
      confidence.tsd_contact_email = 90
    }
  } else if (!data.tsd_contact_name) {
    const tsdContactLabeled = extractLabeledValue(searchText, ['tsd contact', 'distributor contact', 'tsd rep'])
    if (tsdContactLabeled) {
      data.tsd_contact_name = tsdContactLabeled
      confidence.tsd_contact_name = 75
    }
  }

  // --- Extract Customer Information ---
  if (customerCompanySection.length > 0) {
    // Parse structured customer company section
    const companyInfo = parseCustomerCompanySection(customerCompanySection)
    if (companyInfo.companyName) {
      data.customer_company_name = companyInfo.companyName
      confidence.customer_company_name = 90
    }
    if (companyInfo.streetAddress) {
      data.customer_street_address = companyInfo.streetAddress
      confidence.customer_street_address = 85
    }
    if (companyInfo.city) {
      data.customer_city = companyInfo.city
      confidence.customer_city = 85
    }
    if (companyInfo.state) {
      data.customer_state = companyInfo.state
      confidence.customer_state = 85
    }
    if (companyInfo.postalCode) {
      data.customer_postal_code = companyInfo.postalCode
      confidence.customer_postal_code = 85
    }
  }

  if (customerContactSection.length > 0) {
    // Parse structured customer contact section
    const contactInfo = parseCustomerContactSection(customerContactSection)
    if (contactInfo.firstName) {
      data.customer_first_name = contactInfo.firstName
      confidence.customer_first_name = 90
    }
    if (contactInfo.lastName) {
      data.customer_last_name = contactInfo.lastName
      confidence.customer_last_name = 90
    }
    if (contactInfo.jobTitle) {
      data.customer_job_title = contactInfo.jobTitle
      confidence.customer_job_title = 85
    }
    if (contactInfo.email) {
      data.customer_email = contactInfo.email
      confidence.customer_email = 90
    }
    if (contactInfo.phone) {
      data.customer_phone = contactInfo.phone
      confidence.customer_phone = 85
    }
  }

  // Fall back to labeled value extraction if sections didn't work
  if (!data.customer_company_name) {
    const customerCompanyLabels = [
      'customer', 'end user', 'end-user', 'prospect', 'client', 'company name',
      'organization', 'account', 'business name', 'opportunity'
    ]
    const customerCompanyLabeled = extractLabeledValue(searchText, customerCompanyLabels)
    if (customerCompanyLabeled) {
      data.customer_company_name = customerCompanyLabeled
      confidence.customer_company_name = 80
    }
  }

  if (!data.customer_first_name) {
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
  }

  if (!data.customer_job_title) {
    const jobTitleLabels = ['title', 'job title', 'position', 'role']
    const jobTitleLabeled = extractLabeledValue(searchText, jobTitleLabels)
    if (jobTitleLabeled) {
      data.customer_job_title = jobTitleLabeled
      confidence.customer_job_title = 75
    }
  }

  // Extract customer email - look for customer-related email
  if (!data.customer_email) {
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

  // Extract opportunity description from structured section first
  if (opportunitySection.length > 0) {
    // Join opportunity section lines as the description
    const oppDescription = opportunitySection.join(' ').trim()
    if (oppDescription.length > 0) {
      data.opportunity_description = oppDescription
      confidence.opportunity_description = 90
    }
  }

  // Fall back to labeled value extraction or email body
  if (!data.opportunity_description) {
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
  }

  // --- Final cleanup: Remove any @amplifai.com emails that slipped through ---
  // These are internal staff, never actual contacts
  if (isInternalEmail(data.ta_email)) {
    data.ta_email = null
    data.ta_full_name = null
    data.ta_phone = null
    data.ta_company_name = null
    delete confidence.ta_email
    delete confidence.ta_full_name
    delete confidence.ta_phone
    delete confidence.ta_company_name
  }
  if (isInternalEmail(data.tsd_contact_email)) {
    data.tsd_contact_email = null
    data.tsd_contact_name = null
    delete confidence.tsd_contact_email
    delete confidence.tsd_contact_name
  }
  if (isInternalEmail(data.customer_email)) {
    data.customer_email = null
    delete confidence.customer_email
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
  if (!data.ta_full_name && !data.ta_email) {
    warnings.push('Could not extract partner/TA information - check forwarded email content')
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
