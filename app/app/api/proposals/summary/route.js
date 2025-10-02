import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'

export const runtime = 'nodejs'

export async function GET(request){
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  const { data, error } = await supabase.from('propostas').select('id, criado_em, atendido_em, status, criado_por, atendido_por')
  if (error) return handleCORS(NextResponse.json({ error: error.message }, { status:500}), origin)
  let totalSlaMs = 0, countSla = 0, pendentesSla = 0
  data.forEach(p => {
    if (!p.atendido_em) {
      pendentesSla++
      return
    }
    const created = new Date(p.criado_em).getTime()
    const attended = new Date(p.atendido_em).getTime()
    if (!isNaN(created) && !isNaN(attended) && attended >= created) {
      totalSlaMs += (attended - created)
      countSla++
    }
  })
  const slaMedioHoras = countSla > 0 ? (totalSlaMs / countSla) / 1000 / 3600 : 0
  return handleCORS(NextResponse.json({ sla_medio_horas: Number(slaMedioHoras.toFixed(2)), aguardando_analista: pendentesSla }), origin)
}
