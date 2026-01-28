import { NextRequest, NextResponse } from 'next/server'
import { sendTeamsNotification, buildTeamsPayload, type SubmissionType } from '@/lib/teams-webhook'

/**
 * POST /api/webhooks/teams-notification
 *
 * Sends a notification to Microsoft Teams via Zapier webhook
 * Called after successful deal registration submissions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const submissionType = body.submission_type as SubmissionType
    if (!submissionType || !['new_deal', 'completed_prefill'].includes(submissionType)) {
      return NextResponse.json(
        { error: 'Invalid submission_type. Must be "new_deal" or "completed_prefill"' },
        { status: 400 }
      )
    }

    // Build and send the webhook payload
    const payload = buildTeamsPayload(
      submissionType,
      {
        id: body.id || 'unknown',
        created_at: body.created_at,
        ta_full_name: body.ta_full_name || body.partner_name || 'Unknown',
        ta_email: body.ta_email || body.partner_email || '',
        ta_company_name: body.ta_company_name || body.partner_company || '',
        ta_phone: body.ta_phone,
        customer_first_name: body.customer_first_name || '',
        customer_last_name: body.customer_last_name || '',
        customer_company_name: body.customer_company_name || '',
        customer_email: body.customer_email || '',
        customer_phone: body.customer_phone,
        agent_count: body.agent_count,
        implementation_timeline: body.implementation_timeline,
        solutions_interested: body.solutions_interested,
        opportunity_description: body.opportunity_description,
        tsd_name: body.tsd_name,
        tsd_contact_name: body.tsd_contact_name,
        tsd_contact_email: body.tsd_contact_email,
      },
      body.intake_id
    )

    const success = await sendTeamsNotification(payload)

    if (success) {
      return NextResponse.json({ success: true, message: 'Teams notification sent' })
    } else {
      // Don't fail the request if webhook isn't configured or fails
      return NextResponse.json({ success: false, message: 'Teams notification skipped or failed' })
    }
  } catch (error) {
    console.error('Teams notification API error:', error)
    return NextResponse.json(
      { error: 'Failed to process notification' },
      { status: 500 }
    )
  }
}
