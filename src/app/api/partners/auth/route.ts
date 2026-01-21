import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createHash, randomBytes } from 'crypto'

// Simple password hashing (for MVP - consider bcrypt for production)
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(password + useSalt).digest('hex')
  return { hash, salt: useSalt }
}

function verifyPassword(password: string, storedHash: string): boolean {
  // storedHash format: "hash:salt"
  const [hash, salt] = storedHash.split(':')
  const { hash: computedHash } = hashPassword(password, salt)
  return computedHash === hash
}

// POST - Login or Register
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email, password, full_name, company_name, phone, tsd_name } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (action === 'register') {
      // Registration
      if (!full_name || !company_name) {
        return NextResponse.json(
          { error: 'Full name and company name are required' },
          { status: 400 }
        )
      }

      // Check if email already exists
      const { data: existing } = await supabase
        .from('partners')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }

      // Hash password
      const { hash, salt } = hashPassword(password)
      const password_hash = `${hash}:${salt}`

      // Create partner
      const { data: partner, error } = await supabase
        .from('partners')
        .insert({
          email: email.toLowerCase(),
          password_hash,
          full_name,
          company_name,
          phone: phone || null,
          tsd_name: tsd_name || null,
        })
        .select('id, email, full_name, company_name, tsd_name')
        .single()

      if (error) {
        console.error('Registration error:', error)
        return NextResponse.json(
          { error: 'Failed to create account' },
          { status: 500 }
        )
      }

      // Generate session token
      const sessionToken = randomBytes(32).toString('hex')

      return NextResponse.json({
        success: true,
        partner: {
          id: partner.id,
          email: partner.email,
          full_name: partner.full_name,
          company_name: partner.company_name,
          tsd_name: partner.tsd_name,
        },
        token: sessionToken,
      })

    } else {
      // Login
      const { data: partner, error } = await supabase
        .from('partners')
        .select('*')
        .eq('email', email.toLowerCase())
        .single()

      if (error || !partner) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      if (!partner.is_active) {
        return NextResponse.json(
          { error: 'Account is deactivated' },
          { status: 403 }
        )
      }

      // Verify password
      if (!verifyPassword(password, partner.password_hash)) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Update last login
      await supabase
        .from('partners')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', partner.id)

      // Generate session token
      const sessionToken = randomBytes(32).toString('hex')

      return NextResponse.json({
        success: true,
        partner: {
          id: partner.id,
          email: partner.email,
          full_name: partner.full_name,
          company_name: partner.company_name,
          tsd_name: partner.tsd_name,
        },
        token: sessionToken,
      })
    }

  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
