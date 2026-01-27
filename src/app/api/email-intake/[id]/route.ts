import { NextRequest, NextResponse } from 'next/server'
import { createApiClient, createAdminClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createApiClient()

    const { data, error } = await supabase
      .from('email_intakes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error fetching email intake:', err)
    return NextResponse.json(
      { error: 'Failed to fetch email intake' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = createApiClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    const allowedFields = [
      'status',
      'converted_registration_id',
      'review_notes',
      'reviewed_by',
      'admin_edited_fields',
      'admin_edited_at',
      'sent_to_partner_at',
      'sent_to_partner_email',
      'has_conflicts',
      'conflicts',
      'conflicts_resolved_at',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.status === 'converted') {
      updateData.converted_at = new Date().toISOString()
    }

    // Handle sending to partner - save current admin values as snapshot
    if (body.send_to_partner) {
      // Get current intake to create snapshot of admin-edited fields
      const { data: currentIntake } = await supabase
        .from('email_intakes')
        .select('*')
        .eq('id', id)
        .single()

      if (currentIntake) {
        // Create snapshot of all extracted fields as they currently exist
        const adminSnapshot: Record<string, unknown> = {}
        const extractedFields = [
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

        for (const field of extractedFields) {
          adminSnapshot[field] = currentIntake[field]
        }

        updateData.admin_edited_fields = adminSnapshot
        updateData.admin_edited_at = new Date().toISOString()
        updateData.sent_to_partner_at = new Date().toISOString()
        updateData.sent_to_partner_email = body.partner_email || null
      }
    }

    const { data, error } = await supabase
      .from('email_intakes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error updating email intake:', err)
    return NextResponse.json(
      { error: 'Failed to update email intake' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('DELETE request for intake:', id)

    // Use admin client to bypass RLS for delete operations
    let supabase
    let usingAdminClient = false
    try {
      supabase = createAdminClient()
      usingAdminClient = true
      console.log('Using admin client for delete')
    } catch (adminError) {
      // Fall back to API client if service role key not configured
      console.warn('Service role key not configured, using anon key for delete:', adminError)
      supabase = createApiClient()
    }

    // First verify the record exists
    const { data: existing, error: fetchError } = await supabase
      .from('email_intakes')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error finding intake:', fetchError)
      return NextResponse.json(
        { error: 'Intake not found', details: fetchError.message },
        { status: 404 }
      )
    }

    console.log('Found intake, proceeding with delete:', existing)

    const { error } = await supabase
      .from('email_intakes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json(
        { error: 'Database delete failed', details: error.message, code: error.code, usingAdminClient },
        { status: 500 }
      )
    }

    console.log('Delete successful for intake:', id)
    return NextResponse.json({ success: true, deleted_id: id, usingAdminClient })
  } catch (err) {
    console.error('Error deleting email intake:', err)
    return NextResponse.json(
      { error: 'Failed to delete email intake', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
