import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerComponentClient()
    const { id } = await params

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

    const { data, error } = await supabase
      .from('deal_registrations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerComponentClient()
    const { id } = await params

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

    const body = await request.json()
    const { action, rejection_reason, assigned_ae_name, assigned_ae_email } = body

    let updateData: Record<string, unknown> = {}

    if (action === 'update') {
      // Handle field updates (for editing registration details)
      const {
        customer_first_name,
        customer_last_name,
        customer_job_title,
        customer_company_name,
        customer_email,
        customer_phone,
        customer_street_address,
        customer_city,
        customer_state,
        customer_postal_code,
        customer_country,
        agent_count,
        implementation_timeline,
        solutions_interested,
        opportunity_description,
        ta_full_name,
        ta_email,
        ta_phone,
        ta_company_name,
        tsd_name,
        tsd_contact_name,
        tsd_contact_email,
      } = body

      updateData = {
        customer_first_name,
        customer_last_name,
        customer_job_title,
        customer_company_name,
        customer_email,
        customer_phone,
        customer_street_address,
        customer_city,
        customer_state,
        customer_postal_code,
        customer_country,
        agent_count,
        implementation_timeline,
        solutions_interested,
        opportunity_description,
        ta_full_name,
        ta_email,
        ta_phone,
        ta_company_name,
        tsd_name,
        tsd_contact_name,
        tsd_contact_email,
      }
    } else if (action === 'approve') {
      updateData = {
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        assigned_ae_name: assigned_ae_name || null,
        assigned_ae_email: assigned_ae_email || null,
      }

      // Fire Zapier webhook
      const webhookUrl = process.env.ZAPIER_WEBHOOK_URL
      if (webhookUrl) {
        // Get the full registration data
        const { data: registration } = await supabase
          .from('deal_registrations')
          .select('*')
          .eq('id', id)
          .single()

        if (registration) {
          try {
            const webhookPayload = {
              event: 'deal_registration_approved',
              registration_id: id,
              approved_at: updateData.reviewed_at,
              assigned_ae: {
                name: assigned_ae_name,
                email: assigned_ae_email,
              },
              customer: {
                firstName: registration.customer_first_name,
                lastName: registration.customer_last_name,
                jobTitle: registration.customer_job_title,
                companyName: registration.customer_company_name,
                email: registration.customer_email,
                phone: registration.customer_phone,
                streetAddress: registration.customer_street_address,
                city: registration.customer_city,
                state: registration.customer_state,
                postalCode: registration.customer_postal_code,
                country: registration.customer_country,
              },
              opportunity: {
                agentCount: registration.agent_count,
                implementationTimeline: registration.implementation_timeline,
                solutions: registration.solutions_interested,
                description: registration.opportunity_description,
              },
              partner: {
                taFullName: registration.ta_full_name,
                taEmail: registration.ta_email,
                taPhone: registration.ta_phone,
                taCompanyName: registration.ta_company_name,
                tsdName: registration.tsd_name,
                tsdContactName: registration.tsd_contact_name,
                tsdContactEmail: registration.tsd_contact_email,
              },
            }

            const webhookResponse = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            })

            updateData.webhook_sent_at = new Date().toISOString()
            updateData.webhook_response = await webhookResponse.text()
          } catch (webhookError) {
            console.error('Webhook error:', webhookError)
          }
        }
      }
    } else if (action === 'reject') {
      updateData = {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejection_reason || 'No reason provided',
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('deal_registrations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
