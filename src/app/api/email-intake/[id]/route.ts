/**
 * Email Intake Individual Record API
 *
 * GET /api/email-intake/[id] - Fetch a specific email intake record
 * PATCH /api/email-intake/[id] - Update status (reviewed, converted, discarded)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET - Fetch a specific email intake by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid intake ID format' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('email_intakes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Email intake not found' },
          { status: 404 }
        )
      }
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email intake' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update email intake status
 * Used to mark intakes as reviewed, converted, or discarded
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid intake ID format' },
        { status: 400 }
      )
    }

    // Build update object based on allowed fields
    const allowedFields = [
      'status',
      'converted_registration_id',
      'review_notes',
      'reviewed_by'
    ]

    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Validate status if provided
    if (updateData.status) {
      const validStatuses = ['pending', 'reviewed', 'converted', 'discarded']
      if (!validStatuses.includes(updateData.status as string)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }

      // Set converted_at timestamp if status is being set to converted
      if (updateData.status === 'converted') {
        updateData.converted_at = new Date().toISOString()
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('email_intakes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Email intake not found' },
          { status: 404 }
        )
      }
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to update email intake' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete an email intake record
 * Only allows deletion of pending or discarded intakes
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid intake ID format' },
        { status: 400 }
      )
    }

    // First check if the intake exists and can be deleted
    const { data: existing, error: fetchError } = await supabase
      .from('email_intakes')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Email intake not found' },
          { status: 404 }
        )
      }
      throw fetchError
    }

    // Only allow deletion of pending or discarded intakes
    if (existing.status === 'converted') {
      return NextResponse.json(
        { error: 'Cannot delete a converted intake' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('email_intakes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to delete email intake' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Email intake deleted' })

  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
