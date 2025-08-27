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
  const guard = ensureGestor(auth.user)
  if (guard) return handleCORS(NextResponse.json(guard, { status: guard.status }), origin)

  // Verifica propostas em análise há mais de 48h (sem notificar)
  const now = Date.now()
  const ago48 = new Date(now - 48 * 60 * 60 * 1000).toISOString()

  const { data: proposals48h, error } = await supabase
    .from('propostas')
    .select('id, codigo, cnpj, operadora, valor, criado_em, consultor')
    .eq('status', 'em análise')
    .lte('criado_em', ago48)
    .order('criado_em', { ascending: true })

  if (error) {
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  }

  // Propostas há mais de 72h (críticas)
  const ago72 = new Date(now - 72 * 60 * 60 * 1000).toISOString()
  const { data: proposals72h } = await supabase
    .from('propostas')
    .select('id, codigo, cnpj, operadora, valor, criado_em, consultor')
    .eq('status', 'em análise')
    .lte('criado_em', ago72)
    .order('criado_em', { ascending: true })

  const result = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    propostas_48h: (proposals48h || []).length,
    propostas_72h: (proposals72h || []).length,
    alertas_ativos: (proposals48h || []).length > 0,
    ultimo_check: new Date().toLocaleString('pt-BR'),
    detalhes: {
      propostas_48h: (proposals48h || []).map(p => ({
        codigo: p.codigo || p.id,
        cnpj: p.cnpj,
        consultor: p.consultor,
        horas_parado: Math.floor((now - new Date(p.criado_em).getTime()) / (1000 * 60 * 60))
      })),
      propostas_72h_criticas: (proposals72h || []).map(p => ({
        codigo: p.codigo || p.id,
        cnpj: p.cnpj,
        consultor: p.consultor,
        horas_parado: Math.floor((now - new Date(p.criado_em).getTime()) / (1000 * 60 * 60))
      }))
    }
  }

  return handleCORS(NextResponse.json(result), origin)
}

// POST para trigger manual do alerta
export async function POST(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }
  const guard = ensureGestor(auth.user)
  if (guard) return handleCORS(NextResponse.json(guard, { status: guard.status }), origin)

  try {
    // Chama o endpoint de stale-check interno
    const baseUrl = request.headers.get('host') ? `https://${request.headers.get('host')}` : 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/proposals/stale-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || ''
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      return handleCORS(NextResponse.json({ 
        error: 'Falha ao executar verificação', 
        details: result 
      }, { status: response.status }), origin)
    }

    return handleCORS(NextResponse.json({
      ...result,
      triggered_by: auth.user.email,
      triggered_at: new Date().toISOString()
    }), origin)

  } catch (error) {
    return handleCORS(NextResponse.json({ 
      error: 'Erro interno ao executar verificação',
      message: error.message 
    }, { status: 500 }), origin)
  }
}
