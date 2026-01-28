/**
 * Microsoft Teams Notification Webhook
 *
 * Sends notifications to Zapier which routes to Microsoft Teams
 * when partners submit deal registrations.
 */

export type SubmissionType = 'new_deal' | 'completed_prefill'

export interface TeamsWebhookPayload {
  // Submission metadata
  submission_type: SubmissionType
  submission_id: string
  submitted_at: string

  // Partner info
  partner: {
    name: string
    company: string
    email: string
    phone?: string
  }

  // Customer info
  customer: {
    name: string
    company: string
    email: string
    phone?: string
  }

  // Deal details
  deal: {
    agent_count?: string
    implementation_timeline?: string
    solutions?: string[]
    description?: string
  }

  // TSD info
  tsd?: {
    name?: string
    contact_name?: string
    contact_email?: string
  }

  // For completed_prefill, include the intake ID
  intake_id?: string
}

/**
 * Sends a notification to the Zapier webhook for Microsoft Teams
 */
export async function sendTeamsNotification(payload: TeamsWebhookPayload): Promise<boolean> {
  const webhookUrl = process.env.TEAMS_NOTIFICATION_WEBHOOK_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://deal-registration-form.vercel.app')

  if (!webhookUrl) {
    console.log('TEAMS_NOTIFICATION_WEBHOOK_URL not configured, skipping Teams notification')
    return false
  }

  try {
    const adminUrl = `${appUrl}/admin`

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Include structured data
        ...payload,

        // Admin panel link
        admin_url: adminUrl,

        // Flattened fields for easier Zapier access
        partner_name: payload.partner.name,
        partner_company: payload.partner.company,
        partner_email: payload.partner.email,
        customer_name: payload.customer.name,
        customer_company: payload.customer.company,
        customer_email: payload.customer.email,
        agent_count: payload.deal.agent_count || 'Not specified',
        timeline: payload.deal.implementation_timeline || 'Not specified',
        solutions: payload.deal.solutions?.join(', ') || 'Not specified',
        tsd_name: payload.tsd?.name || 'Not specified',
      }),
    })

    if (!response.ok) {
      console.error('Teams webhook failed:', response.status, await response.text())
      return false
    }

    console.log('Teams notification sent successfully:', payload.submission_type)
    return true
  } catch (error) {
    console.error('Failed to send Teams notification:', error)
    return false
  }
}

/**
 * Helper to build payload from deal registration data
 */
export function buildTeamsPayload(
  type: SubmissionType,
  data: {
    id: string
    created_at?: string
    // Partner
    ta_full_name: string
    ta_email: string
    ta_company_name: string
    ta_phone?: string | null
    // Customer
    customer_first_name: string
    customer_last_name: string
    customer_company_name: string
    customer_email: string
    customer_phone?: string | null
    // Deal
    agent_count?: string | null
    implementation_timeline?: string | null
    solutions_interested?: string[] | null
    opportunity_description?: string | null
    // TSD
    tsd_name?: string | null
    tsd_contact_name?: string | null
    tsd_contact_email?: string | null
  },
  intakeId?: string
): TeamsWebhookPayload {
  return {
    submission_type: type,
    submission_id: data.id,
    submitted_at: data.created_at || new Date().toISOString(),
    intake_id: intakeId,
    partner: {
      name: data.ta_full_name,
      company: data.ta_company_name,
      email: data.ta_email,
      phone: data.ta_phone || undefined,
    },
    customer: {
      name: `${data.customer_first_name} ${data.customer_last_name}`.trim(),
      company: data.customer_company_name,
      email: data.customer_email,
      phone: data.customer_phone || undefined,
    },
    deal: {
      agent_count: data.agent_count || undefined,
      implementation_timeline: data.implementation_timeline || undefined,
      solutions: data.solutions_interested || undefined,
      description: data.opportunity_description || undefined,
    },
    tsd: {
      name: data.tsd_name || undefined,
      contact_name: data.tsd_contact_name || undefined,
      contact_email: data.tsd_contact_email || undefined,
    },
  }
}
