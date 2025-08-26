import { NextResponse } from 'next/server'
import { supabase, handleCORS } from '@/lib/api-helpers'

// ENDPOINT TEMPORÁRIO APENAS PARA TESTES - REMOVER EM PRODUÇÃO
export async function GET(request) {
  const origin = request.headers.get('origin')
  
  // Verificação simples de desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    return handleCORS(NextResponse.json({ error: 'Endpoint de teste não disponível em produção' }, { status: 404 }), origin)
  }

  try {
    console.log('🧪 [TEST] Iniciando teste do sistema de alertas...')
    
    // 1. Buscar propostas em análise
    const { data: proposals, error } = await supabase
      .from('propostas')
      .select('*')
      .eq('status', 'em análise')
      .order('criado_em', { ascending: true })

    if (error) {
      return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
    }

    const now = Date.now()
    const ago48 = new Date(now - 48 * 60 * 60 * 1000)
    const ago72 = new Date(now - 72 * 60 * 60 * 1000)

    // Propostas estagnadas há mais de 48h
    const stale48h = proposals.filter(p => new Date(p.criado_em) <= ago48)
    // Propostas críticas há mais de 72h  
    const stale72h = proposals.filter(p => new Date(p.criado_em) <= ago72)

    console.log(`🔍 [TEST] Propostas em análise: ${proposals.length}`)
    console.log(`⏰ [TEST] Propostas +48h: ${stale48h.length}`)
    console.log(`🚨 [TEST] Propostas +72h críticas: ${stale72h.length}`)

    // 2. Buscar gestores para notificação
    const { data: gestores, error: gestorError } = await supabase
      .from('usuarios')
      .select('email, nome')
      .eq('tipo_usuario', 'gestor')

    if (gestorError) {
      console.error('❌ [TEST] Erro ao buscar gestores:', gestorError)
    }

    const result = {
      test_mode: true,
      timestamp: new Date().toISOString(),
      propostas_total: proposals.length,
      propostas_48h: stale48h.length,
      propostas_72h: stale72h.length,
      gestores_encontrados: (gestores || []).length,
      gestores_emails: (gestores || []).map(g => g.email),
      propostas_em_analise: proposals.map(p => ({
        codigo: p.codigo || p.id,
        cnpj: p.cnpj,
        consultor: p.consultor,
        criado_em: p.criado_em,
        horas_parado: Math.floor((now - new Date(p.criado_em).getTime()) / (1000 * 60 * 60)),
        elegivel_48h: new Date(p.criado_em) <= ago48,
        elegivel_72h: new Date(p.criado_em) <= ago72
      })),
      next_steps: [
        'Para testar o envio de e-mail, use: POST /api/test/alerts/trigger',
        'Para verificar configuração SMTP, verifique variáveis de ambiente',
        'Para simular proposta antiga, modifique criado_em no banco diretamente'
      ]
    }

    console.log('✅ [TEST] Análise concluída')
    return handleCORS(NextResponse.json(result), origin)

  } catch (error) {
    console.error('❌ [TEST] Erro:', error)
    return handleCORS(NextResponse.json({ 
      error: 'Erro no teste',
      message: error.message 
    }, { status: 500 }), origin)
  }
}

// POST para simular trigger de alerta (sem autenticação para teste)
export async function POST(request) {
  const origin = request.headers.get('origin')
  
  if (process.env.NODE_ENV === 'production') {
    return handleCORS(NextResponse.json({ error: 'Endpoint de teste não disponível em produção' }, { status: 404 }), origin)
  }

  try {
    console.log('🚀 [TEST] Executando trigger manual de teste...')

    // Chama o endpoint real de stale-check simulando um gestor
    const baseUrl = `http://${request.headers.get('host') || 'localhost:3000'}`
    
    // Para este teste, vamos criar um token temporário ou usar bypass
    // Alternativa: chamar a lógica diretamente sem passar pela autenticação
    
    const now = Date.now()
    const ago48 = new Date(now - 48 * 60 * 60 * 1000).toISOString()
    const ago72 = new Date(now - 72 * 60 * 60 * 1000).toISOString()

    // Busca propostas na janela de 48-72h
    const { data: proposals, error } = await supabase
      .from('propostas')
      .select('*')
      .eq('status', 'em análise')
      .gte('criado_em', ago72)
      .lte('criado_em', ago48)
      .order('criado_em', { ascending: true })

    if (error) {
      return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
    }

    console.log(`📧 [TEST] Propostas elegíveis para notificação: ${(proposals || []).length}`)

    // Busca gestores
    const { data: gestores } = await supabase
      .from('usuarios')
      .select('email, nome')
      .eq('tipo_usuario', 'gestor')

    const result = {
      test_mode: true,
      simulated_trigger: true,
      timestamp: new Date().toISOString(),
      proposals_to_notify: (proposals || []).length,
      gestores_destinatarios: (gestores || []).length,
      gestores_emails: (gestores || []).map(g => g.email),
      proposals_details: (proposals || []).map(p => ({
        codigo: p.codigo || p.id,
        cnpj: p.cnpj,
        consultor: p.consultor,
        horas_parado: Math.floor((now - new Date(p.criado_em).getTime()) / (1000 * 60 * 60))
      })),
      email_would_be_sent: (proposals || []).length > 0 && (gestores || []).length > 0,
      note: 'Este é um teste. Nenhum e-mail foi realmente enviado.'
    }

    return handleCORS(NextResponse.json(result), origin)

  } catch (error) {
    console.error('❌ [TEST] Erro no trigger:', error)
    return handleCORS(NextResponse.json({ 
      error: 'Erro no trigger de teste',
      message: error.message 
    }, { status: 500 }), origin)
  }
}
