import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'

export async function GET(request, { params }) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }
  // gestores podem ver qualquer histórico; analistas apenas dos seus
  const { id } = params
  // Busca proposta p/ checar autoria quando não gestor
  const { data: prop } = await supabase.from('propostas').select('criado_por').eq('id', id).single()
  if (auth.user.tipo_usuario !== 'gestor' && prop?.criado_por !== auth.user.id) {
    return handleCORS(NextResponse.json({ error: 'Sem permissão' }, { status: 403 }), origin)
  }

  const { data, error } = await supabase
    .from('propostas_auditoria')
    .select('id, alterado_por, changes, criado_em')
    .eq('proposta_id', id)
    .order('criado_em', { ascending: false })

  if (error) return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  return handleCORS(NextResponse.json(data || []), origin)
}
