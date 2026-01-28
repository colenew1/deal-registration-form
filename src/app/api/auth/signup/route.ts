import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// Force Vercel cache rebuild
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, company_name, phone, tsd_name } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Create auth user
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (authError) {
      console.error('Auth error:', authError)
      // Check for duplicate email
      if (authError.message.includes('already') || authError.message.includes('exists')) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Create user profile using admin client (bypasses RLS)
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        id: newUser.user.id,
        email: email.toLowerCase(),
        full_name,
        company_name: company_name || null,
        phone: phone || null,
        tsd_name: tsd_name || null,
        role: 'partner',
        is_active: true,
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      // Try to clean up the auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    // Migrate existing deal registrations that match this email
    const { data: migratedDeals, error: migrateError } = await adminClient
      .from('deal_registrations')
      .update({ partner_id: newUser.user.id })
      .eq('ta_email', email.toLowerCase())
      .is('partner_id', null)
      .select('id')

    if (migrateError) {
      console.error('Migration error (non-fatal):', migrateError)
    }

    const migratedCount = migratedDeals?.length || 0
    console.log(`Migrated ${migratedCount} existing registrations to new account`)

    return NextResponse.json({
      success: true,
      userId: newUser.user.id,
      email: newUser.user.email,
      migratedRegistrations: migratedCount,
    })
  } catch (err) {
    console.error('Signup API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
