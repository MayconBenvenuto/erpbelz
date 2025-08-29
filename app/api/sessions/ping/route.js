import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)

  try {
    const { sessionId } = await request.json().catch(() => ({}))
    if (!sessionId) return handleCORS(NextResponse.json({ error: 'sessionId requerido' }, { status: 400 }), origin)

    // Verifica se a sessão ainda está aberta; se já tiver logout, ignora ping
    // Busca sessão explicitamente (evita optional chaining que retorna undefined em produção)
    const { data: sess } = await supabase
      .from('sessoes')
      .select('id, data_logout')
      .eq('id', sessionId)
      .eq('usuario_id', auth.user.id)
      .single()

  if (!sess || sess.data_logout) {
      return handleCORS(NextResponse.json({ ok: false, skipped: true, reason: 'session_closed' }), origin)
    }

    const nowIso = new Date().toISOString()
    const { error } = await supabase
      .from('sessoes')
      .update({ ultimo_ping: nowIso })
      .eq('id', sessionId)
      .eq('usuario_id', auth.user.id)

  // Atualiza presença do usuário usando coluna ultimo_refresh (schema produção)
  try { await supabase.from('usuarios').update({ ultimo_refresh: nowIso }).eq('id', auth.user.id) } catch {}

    if (error) {
      return handleCORS(NextResponse.json({ ok: false, skipped: true }), origin)
    }
    return handleCORS(NextResponse.json({ ok: true }), origin)
  } catch {
    return handleCORS(NextResponse.json({ ok: false }), origin)
  }
}
