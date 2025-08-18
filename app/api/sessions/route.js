import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth, ensureGestor } from '@/lib/api-helpers'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function GET(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }

  // Apenas gestores devem ver sessões
  const guard = ensureGestor(auth.user)
  if (guard) return handleCORS(NextResponse.json(guard, { status: guard.status }), origin)

  const { data, error } = await supabase
    .from('sessoes')
    .select('*')
    .order('data_login', { ascending: false })
    .limit(100)

  if (error) {
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  }

  return handleCORS(NextResponse.json(data || []), origin)
}
