import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase-server'

/**
 * GET /api/email-intake/count
 * Returns the count of pending email intakes
 */
export async function GET() {
  try {
    const supabase = createApiClient()

    const { count, error } = await supabase
      .from('email_intakes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) {
      throw error
    }

    return NextResponse.json({ pending_count: count || 0 })
  } catch (err) {
    console.error('Error fetching email intake count:', err)
    return NextResponse.json(
      { error: 'Failed to fetch count', pending_count: 0 },
      { status: 500 }
    )
  }
}
