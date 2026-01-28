import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase-middleware'

// Public routes - accessible without authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/thank-you',
  '/partner/register',
]

// Routes that start with these paths are public
const PUBLIC_ROUTE_PREFIXES = [
  '/register/', // /register/[id] for pre-filled forms
  '/api/registrations', // POST is public for guest submissions
  '/api/email-intake', // Webhook endpoint
  '/api/auth/', // Auth endpoints (signup, etc.) must be public
]

// Admin-only routes
const ADMIN_ROUTES = ['/admin']

// Partner routes (accessible by partners and admins)
const PARTNER_ROUTES = ['/partner']

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Check if route is public BEFORE initializing Supabase
  const isPublicRoute = PUBLIC_ROUTES.includes(path)
  const isPublicPrefix = PUBLIC_ROUTE_PREFIXES.some((prefix) =>
    path.startsWith(prefix)
  )

  // Allow public routes without auth check
  if (isPublicRoute || isPublicPrefix) {
    return NextResponse.next()
  }

  // Check if Supabase is configured before trying to use it
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-supabase-url-here') {
    // Supabase not configured - allow request but protected routes won't work
    console.warn('Supabase credentials not configured. Auth will not work.')
    return NextResponse.next()
  }

  const { response, user, supabase } = await updateSession(request)

  // Check if user is authenticated
  if (!user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(redirectUrl)
  }

  // Get user profile for role check
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  // Check if user has a profile and is active
  if (!profile) {
    // User exists in auth but has no profile - likely a new signup
    // Allow them to continue (profile creation happens during registration)
    return response
  }

  if (!profile.is_active) {
    // User is deactivated
    await supabase.auth.signOut()
    return NextResponse.redirect(
      new URL('/login?error=account_inactive', request.url)
    )
  }

  // Check admin routes
  const isAdminRoute = ADMIN_ROUTES.some((route) => path.startsWith(route))
  if (isAdminRoute && profile.role !== 'admin') {
    // Non-admin trying to access admin route - redirect to partner dashboard
    return NextResponse.redirect(new URL('/partner/dashboard', request.url))
  }

  // Check partner routes
  const isPartnerRoute = PARTNER_ROUTES.some((route) => path.startsWith(route))
  if (isPartnerRoute && profile.role !== 'partner' && profile.role !== 'admin') {
    // Unknown role - redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
