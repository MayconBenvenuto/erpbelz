import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth, mapSupabaseErrorToStatus, supabaseConfigStatus } from '@/lib/api-helpers'
import { STATUS_OPTIONS } from '@/lib/constants'

export const runtime = 'nodejs'

export async function GET(request, { params }) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }
  const cfg = supabaseConfigStatus()
  if (!cfg.hasUrl || !cfg.hasAnonKey) {
    return handleCORS(NextResponse.json({ error: 'Supabase não configurado para runtime', config: cfg }, { status: 503 }), origin)
  }
  // gestores podem ver qualquer histórico; analistas apenas dos seus
  const { id } = params
  // Busca proposta p/ checar autoria quando não gestor
  const { data: prop, error: propErr } = await supabase
    .from('propostas')
    .select('criado_por')
    .eq('id', id)
    .single()
  if (propErr) {
    const status = mapSupabaseErrorToStatus(propErr)
    return handleCORS(NextResponse.json({ error: propErr.message }, { status }), origin)
  }
  if (auth.user.tipo_usuario !== 'gestor' && prop?.criado_por !== auth.user.id) {
    return handleCORS(NextResponse.json({ error: 'Sem permissão' }, { status: 403 }), origin)
  }

  const { data, error } = await supabase
    .from('propostas_auditoria')
    .select('id, alterado_por, changes, criado_em')
    .eq('proposta_id', id)
    .order('criado_em', { ascending: false })

  if (error)
    return handleCORS(
      NextResponse.json({ error: error.message }, { status: mapSupabaseErrorToStatus(error) }),
      origin
    )

  // Whitelist de campos auditáveis
  const ALLOWED = new Set([
    'status',
    'quantidade_vidas',
    'valor',
    'previsao_implantacao',
    'operadora',
    'consultor',
    'consultor_email',
  ])
  const sanitized = (data || []).map((row) => {
    const filtered = {}
    const changes = row.changes || {}
    for (const k of Object.keys(changes)) {
      if (ALLOWED.has(k)) {
        // Se for status, validar valores
        if (k === 'status') {
          const b = changes[k]?.before
          const a = changes[k]?.after
          if (
            (b && !STATUS_OPTIONS.includes(String(b))) ||
            (a && !STATUS_OPTIONS.includes(String(a)))
          )
            continue
        }
        filtered[k] = changes[k]
      }
    }
    return {
      id: row.id,
      alterado_por: row.alterado_por,
      criado_em: row.criado_em,
      changes: filtered,
    }
  })
  return handleCORS(NextResponse.json(sanitized), origin)
}
