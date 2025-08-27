import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'

// Endpoint leve para monitoramento SLA: retorna somente propostas livres (sem atendido_por)
// Campos mínimos: id, codigo, criado_em
// Uso: substitui necessidade de baixar payload completo para watchers SLA.
export const runtime = 'nodejs'

export async function GET(request){
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  // Consultor não precisa desses dados agregados
  if (auth.user.tipo_usuario === 'consultor') {
    return handleCORS(NextResponse.json([]), origin)
  }
  // Filtro: status 'em análise' e sem atendido_por
  const { data, error } = await supabase
    .from('propostas')
    .select('id,codigo,criado_em')
    .eq('status','em análise')
    .is('atendido_por', null)
    .order('criado_em', { ascending: true })
  if (error) return handleCORS(NextResponse.json({ error: error.message }, { status:500 }), origin)
  return handleCORS(NextResponse.json(data || []), origin)
}
