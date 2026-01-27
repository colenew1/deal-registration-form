import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerComponentClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Fetch all registrations for admin
    const { data, error } = await supabase
      .from('deal_registrations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST remains public for guest submissions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient()
    const body = await request.json()

    // Validate required fields
    const required = [
      'customer_first_name',
      'customer_last_name',
      'customer_company_name',
      'customer_email',
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
        source: body.source === 'email_import' ? 'email_import' : 'form',
        original_email_content: body.original_email_content || null,
        partner_id: body.partner_id || null,
        status: 'pending',
      }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send webhook notification for new registration
    const newRegistrationWebhookUrl = process.env.NEW_REGISTRATION_WEBHOOK_URL
    if (newRegistrationWebhookUrl) {
      try {
        await fetch(newRegistrationWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'new_deal_registration',
            registration_id: data.id,
            submitted_at: data.created_at,
            customer: {
              name: `${data.customer_first_name} ${data.customer_last_name}`,
              company: data.customer_company_name,
              email: data.customer_email,
            },
            opportunity: {
              agentCount: data.agent_count,
              timeline: data.implementation_timeline,
              solutions: data.solutions_interested,
              description: data.opportunity_description,
            },
            partner: {
              taName: data.ta_full_name,
              taCompany: data.ta_company_name,
              taEmail: data.ta_email,
              tsdName: data.tsd_name,
            },
            source: data.source,
          }),
        })
        console.log('New registration webhook sent successfully')
      } catch (webhookError) {
        // Log but don't fail the request if webhook fails
        console.error('Failed to send new registration webhook:', webhookError)
      }
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
