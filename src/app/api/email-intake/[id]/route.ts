import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase-server'

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
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.status === 'converted') {
      updateData.converted_at = new Date().toISOString()
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
    const supabase = createApiClient()

    const { error } = await supabase
      .from('email_intakes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase delete error:', error)
      throw error
    }

    return NextResponse.json({ success: true, deleted_id: id })
  } catch (err) {
    console.error('Error deleting email intake:', err)
    return NextResponse.json(
      { error: 'Failed to delete email intake' },
      { status: 500 }
    )
  }
}
