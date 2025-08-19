import { NextResponse } from 'next/server'
import { handleCORS, getSupabaseHealth } from '@/lib/api-helpers'

export async function GET(request) {
  const origin = request.headers.get('origin')
  const health = await getSupabaseHealth()
  const status = health.ok ? 200 : 500
  return handleCORS(NextResponse.json({
    status: 'ok',
    supabase: health
  }, { status }), origin)
}

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}
