import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { supabase, handleCORS, requireAuth, cacheJson } from '@/lib/api-helpers'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function GET(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  if (auth.user?.tipo_usuario !== 'gestor') {
    return handleCORS(NextResponse.json({ message: 'Acesso negado' }, { status: 403 }), origin)
  }

  const now = Date.now()
  const cutoff30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Contagens rápidas com head+count
  let total30d = 0
  try {
    const { count } = await supabase
      .from('propostas')
      .select('id', { count: 'exact', head: true })
      .gte('criado_em', cutoff30d)
    total30d = typeof count === 'number' ? count : 0
  } catch {}

  let implantadas30d = 0
  try {
    const { count } = await supabase
      .from('propostas')
      .select('id', { count: 'exact', head: true })
      .gte('criado_em', cutoff30d)
      .eq('status', 'implantado')
    implantadas30d = typeof count === 'number' ? count : 0
  } catch {}

  // Propostas sem responsável >24h (no período) – leve
  let unattendedCritical = 0
  try {
    const { data } = await supabase
      .from('propostas')
      .select('id, criado_em, atendido_por')
      .gte('criado_em', cutoff30d)
    const arr = Array.isArray(data) ? data : []
    unattendedCritical = arr.filter(p => !p?.atendido_por && p?.criado_em && (now - new Date(p.criado_em).getTime() > 24 * 60 * 60 * 1000)).length
  } catch {}

  const payload = {
    total30d,
    implantadas30d,
    unattendedCritical,
    generated_at: new Date().toISOString(),
  }

  return cacheJson(request, origin, payload, { maxAge: 60, swr: 300 })
}
