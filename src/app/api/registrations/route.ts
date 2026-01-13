import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('deal_registrations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const required = [
      'customer_first_name',
      'customer_last_name',
      'customer_job_title',
      'customer_company_name',
      'customer_email',
      'agent_count',
      'opportunity_description',
      'ta_full_name',
      'ta_email',
      'ta_company_name',
      'tsd_name',
    ]

    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('deal_registrations')
      .insert([{
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
        agent_count: body.agent_count || null,
        implementation_timeline: body.implementation_timeline || null,
        solutions_interested: body.solutions_interested?.length > 0 ? body.solutions_interested : null,
        opportunity_description: body.opportunity_description || null,
        ta_full_name: body.ta_full_name,
        ta_email: body.ta_email,
        ta_phone: body.ta_phone || null,
        ta_company_name: body.ta_company_name,
        tsd_name: body.tsd_name,
        tsd_contact_name: body.tsd_contact_name || null,
        tsd_contact_email: body.tsd_contact_email || null,
        source: 'form',
        status: 'pending',
      }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
