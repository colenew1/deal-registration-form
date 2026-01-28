import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase-server'
import { sendTeamsNotification, buildTeamsPayload } from '@/lib/teams-webhook'

/**
 * POST /api/email-intake/[id]/partner-submit
 *
 * Called when a partner submits updated information for an intake.
 * Compares partner values to admin snapshot to detect conflicts.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = createApiClient()

    // Get the current intake with admin snapshot
    const { data: intake, error: fetchError } = await supabase
      .from('email_intakes')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !intake) {
      return NextResponse.json(
        { error: 'Intake not found' },
        { status: 404 }
      )
    }

    // Fields that we're tracking for conflicts
    const trackedFields = [
      'extracted_ta_full_name',
      'extracted_ta_email',
      'extracted_ta_phone',
      'extracted_ta_company_name',
      'extracted_tsd_name',
      'extracted_tsd_contact_name',
      'extracted_tsd_contact_email',
      'extracted_customer_first_name',
      'extracted_customer_last_name',
      'extracted_customer_company_name',
      'extracted_customer_email',
      'extracted_customer_phone',
      'extracted_customer_job_title',
      'extracted_customer_street_address',
      'extracted_customer_city',
      'extracted_customer_state',
      'extracted_customer_postal_code',
      'extracted_customer_country',
      'extracted_agent_count',
      'extracted_implementation_timeline',
      'extracted_solutions_interested',
      'extracted_opportunity_description',
    ]

    // Map form field names to extracted field names
    const fieldMapping: Record<string, string> = {
      ta_full_name: 'extracted_ta_full_name',
      ta_email: 'extracted_ta_email',
      ta_phone: 'extracted_ta_phone',
      ta_company_name: 'extracted_ta_company_name',
      tsd_name: 'extracted_tsd_name',
      tsd_contact_name: 'extracted_tsd_contact_name',
      tsd_contact_email: 'extracted_tsd_contact_email',
      customer_first_name: 'extracted_customer_first_name',
      customer_last_name: 'extracted_customer_last_name',
      customer_company_name: 'extracted_customer_company_name',
      customer_email: 'extracted_customer_email',
      customer_phone: 'extracted_customer_phone',
      customer_job_title: 'extracted_customer_job_title',
      customer_street_address: 'extracted_customer_street_address',
      customer_city: 'extracted_customer_city',
      customer_state: 'extracted_customer_state',
      customer_postal_code: 'extracted_customer_postal_code',
      customer_country: 'extracted_customer_country',
      agent_count: 'extracted_agent_count',
      implementation_timeline: 'extracted_implementation_timeline',
      solutions_interested: 'extracted_solutions_interested',
      opportunity_description: 'extracted_opportunity_description',
    }

    // Build partner submitted values (normalized to extracted_ field names)
    const partnerValues: Record<string, unknown> = {}
    for (const [formField, extractedField] of Object.entries(fieldMapping)) {
      if (body[formField] !== undefined) {
        partnerValues[extractedField] = body[formField]
      }
    }

    // Get admin snapshot (what admin had when they sent to partner)
    const adminSnapshot = intake.admin_edited_fields as Record<string, unknown> | null

    // Detect conflicts - cases where admin and partner both changed the same field differently
    const conflicts: Array<{ field: string; admin_value: unknown; partner_value: unknown }> = []

    if (adminSnapshot) {
      for (const field of trackedFields) {
        const adminValue = adminSnapshot[field]
        const partnerValue = partnerValues[field]

        // Skip if partner didn't submit this field
        if (partnerValue === undefined) continue

        // Check if partner value differs from admin value
        const adminStr = JSON.stringify(adminValue ?? '')
        const partnerStr = JSON.stringify(partnerValue ?? '')

        if (adminStr !== partnerStr) {
          // Both have values and they differ - this is a conflict
          // Only flag as conflict if admin had actually set a value
          if (adminValue && adminValue !== '') {
            conflicts.push({
              field: field.replace('extracted_', ''),  // Clean field name for display
              admin_value: adminValue,
              partner_value: partnerValue,
            })
          }
        }
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      partner_submitted_values: partnerValues,
      updated_at: new Date().toISOString(),
    }

    // Update extracted fields with partner values (they will be kept unless admin resolves conflict)
    for (const [field, value] of Object.entries(partnerValues)) {
      updateData[field] = value
    }

    // If there are conflicts, flag them
    if (conflicts.length > 0) {
      updateData.has_conflicts = true
      updateData.conflicts = conflicts
      updateData.status = 'reviewed'  // Keep in reviewed so admin can resolve
    } else {
      updateData.has_conflicts = false
      updateData.conflicts = null
      // Status can stay as-is or move forward
    }

    // Update the intake
    const { data, error: updateError } = await supabase
      .from('email_intakes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Send Teams notification for completed pre-filled form (fire and forget)
    try {
      const teamsPayload = buildTeamsPayload(
        'completed_prefill',
        {
          id: id,
          created_at: data?.updated_at || new Date().toISOString(),
          ta_full_name: (partnerValues.extracted_ta_full_name as string) || intake.extracted_ta_full_name || '',
          ta_email: (partnerValues.extracted_ta_email as string) || intake.extracted_ta_email || '',
          ta_company_name: (partnerValues.extracted_ta_company_name as string) || intake.extracted_ta_company_name || '',
          ta_phone: (partnerValues.extracted_ta_phone as string) || intake.extracted_ta_phone,
          customer_first_name: (partnerValues.extracted_customer_first_name as string) || intake.extracted_customer_first_name || '',
          customer_last_name: (partnerValues.extracted_customer_last_name as string) || intake.extracted_customer_last_name || '',
          customer_company_name: (partnerValues.extracted_customer_company_name as string) || intake.extracted_customer_company_name || '',
          customer_email: (partnerValues.extracted_customer_email as string) || intake.extracted_customer_email || '',
          customer_phone: (partnerValues.extracted_customer_phone as string) || intake.extracted_customer_phone,
          agent_count: (partnerValues.extracted_agent_count as string) || intake.extracted_agent_count,
          implementation_timeline: (partnerValues.extracted_implementation_timeline as string) || intake.extracted_implementation_timeline,
          solutions_interested: (partnerValues.extracted_solutions_interested as string[]) || intake.extracted_solutions_interested,
          opportunity_description: (partnerValues.extracted_opportunity_description as string) || intake.extracted_opportunity_description,
          tsd_name: (partnerValues.extracted_tsd_name as string) || intake.extracted_tsd_name,
          tsd_contact_name: (partnerValues.extracted_tsd_contact_name as string) || intake.extracted_tsd_contact_name,
          tsd_contact_email: (partnerValues.extracted_tsd_contact_email as string) || intake.extracted_tsd_contact_email,
        },
        id
      )
      await sendTeamsNotification(teamsPayload)
    } catch (webhookError) {
      console.error('Teams notification failed (non-blocking):', webhookError)
    }

    return NextResponse.json({
      success: true,
      intake_id: id,
      has_conflicts: conflicts.length > 0,
      conflicts_count: conflicts.length,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      message: conflicts.length > 0
        ? 'Partner submission received. Admin review required to resolve conflicts.'
        : 'Partner submission received successfully.',
    })

  } catch (err) {
    console.error('Error processing partner submission:', err)
    return NextResponse.json(
      { error: 'Failed to process submission', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
