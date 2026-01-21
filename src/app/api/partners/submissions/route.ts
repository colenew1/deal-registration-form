import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Fetch partner's submissions
export async function GET(request: NextRequest) {
  try {
    const partnerId = request.headers.get('x-partner-id')

    if (!partnerId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { data: submissions, error } = await supabase
      .from('deal_registrations')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching submissions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ submissions })

  } catch (error) {
    console.error('Submissions fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new submission from partner portal
export async function POST(request: NextRequest) {
  try {
    const partnerId = request.headers.get('x-partner-id')

    if (!partnerId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Get partner info to auto-fill TA fields
    const { data: partner } = await supabase
      .from('partners')
      .select('full_name, email, phone, company_name, tsd_name')
      .eq('id', partnerId)
      .single()

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Validate required fields
    const requiredFields = ['customer_first_name', 'customer_last_name', 'customer_company_name', 'customer_email']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field.replace(/_/g, ' ')} is required` },
          { status: 400 }
        )
      }
    }

    // Create the submission with partner info auto-filled
    const { data: submission, error } = await supabase
      .from('deal_registrations')
      .insert({
        // Customer info from form
        customer_first_name: body.customer_first_name,
        customer_last_name: body.customer_last_name,
        customer_job_title: body.customer_job_title || null,
        customer_company_name: body.customer_company_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone || null,
        customer_street_address: body.customer_street_address || null,
        customer_city: body.customer_city || null,
        customer_state: body.customer_state || null,
        customer_postal_code: body.customer_postal_code || null,
        customer_country: body.customer_country || null,

        // Opportunity info
        agent_count: body.agent_count || null,
        implementation_timeline: body.implementation_timeline || null,
        solutions_interested: body.solutions_interested || null,
        opportunity_description: body.opportunity_description || null,

        // Auto-fill TA info from partner profile
        ta_full_name: partner.full_name,
        ta_email: partner.email,
        ta_phone: partner.phone,
        ta_company_name: partner.company_name,

        // TSD info
        tsd_name: body.tsd_name || partner.tsd_name || '',
        tsd_contact_name: body.tsd_contact_name || null,
        tsd_contact_email: body.tsd_contact_email || null,

        // Metadata
        partner_id: partnerId,
        source: 'form',
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating submission:', error)
      return NextResponse.json(
        { error: 'Failed to create submission' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      submission
    })

  } catch (error) {
    console.error('Submission create error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
