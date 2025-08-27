import { supabase } from '@/lib/api-helpers'

export async function GET() {
  try {
    console.log('🔍 Testando sistema de alertas para propostas 48h+...')

    const now = Date.now()
    const ago48 = new Date(now - 48 * 60 * 60 * 1000).toISOString()
    const ago120 = new Date(now - 120 * 60 * 60 * 1000).toISOString()

    console.log(`⏰ Janela de tempo: ${ago120} até ${ago48}`)

    // Buscar propostas em análise dentro da janela de tempo
    const { data: proposals, error } = await supabase
      .from('propostas')
      .select('*')
      .eq('status', 'em análise')
      .gte('criado_em', ago120)
      .lte('criado_em', ago48)

    if (error) {
      console.error('❌ Erro ao buscar propostas:', error)
      throw error
    }

    console.log(`📋 Propostas encontradas: ${proposals?.length || 0}`)
    
    if (proposals && proposals.length > 0) {
      proposals.forEach(p => {
        const horasAnalise = Math.floor((now - new Date(p.criado_em).getTime()) / (1000 * 60 * 60))
        console.log(`  📄 ${p.codigo} - ${p.cnpj} - ${horasAnalise}h em análise`)
      })
    }

    // Buscar gestores
    const { data: gestors, error: gestorError } = await supabase
      .from('usuarios')
      .select('email')
      .eq('tipo_usuario', 'gestor')

    if (gestorError) {
      console.error('❌ Erro ao buscar gestores:', gestorError)
      throw gestorError
    }

    console.log(`👥 Gestores encontrados: ${gestors?.length || 0}`)
    gestors?.forEach(g => console.log(`  📧 ${g.email}`))

    return Response.json({
      test_mode: true,
      timestamp: new Date().toISOString(),
      window: { start: ago120, end: ago48 },
      propostas_encontradas: proposals?.length || 0,
      gestores_encontrados: gestors?.length || 0,
      propostas: proposals?.map(p => ({
        codigo: p.codigo,
        cnpj: p.cnpj,
        consultor: p.consultor,
        horas_analise: Math.floor((now - new Date(p.criado_em).getTime()) / (1000 * 60 * 60)),
        criado_em: p.criado_em
      })) || [],
      gestores: gestors?.map(g => g.email) || []
    })

  } catch (error) {
    console.error('❌ Erro no teste de alertas:', error)
    return Response.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}
