import { NextResponse } from 'next/server'
import { handleCORS, supabaseUrl } from '@/lib/api-helpers'

export async function GET(request) {
  const origin = request.headers.get('origin')
  const ok = Boolean(supabaseUrl)
  return handleCORS(NextResponse.json({ ok, supabaseUrl: supabaseUrl || null }), origin)
}

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}
