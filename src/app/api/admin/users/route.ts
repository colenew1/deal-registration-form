import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient, createAdminClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Verify caller is admin
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse request body
    const { email, password, full_name, role } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (role && !['admin', 'partner'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin or partner' }, { status: 400 })
    }

    // Use admin client to create user
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
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Create user profile
    console.log('Creating profile for user:', newUser.user.id)
    const { data: profileData, error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        id: newUser.user.id,
        role: role || 'partner',
        full_name,
        email: email.toLowerCase(),
        is_active: true,
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile error details:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      })
      // Try to clean up the auth user
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: `Failed to create user profile: ${profileError.message}` }, { status: 500 })
    }

    console.log('Profile created successfully:', profileData)

    return NextResponse.json({
      success: true,
      userId: newUser.user.id,
    })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
