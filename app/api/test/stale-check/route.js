import { supabase } from '@/lib/api-helpers'

export async function GET() {
  try {

    const now = Date.now()
    const ago48 = new Date(now - 48 * 60 * 60 * 1000).toISOString()
    const ago120 = new Date(now - 120 * 60 * 60 * 1000).toISOString()


    // Buscar propostas em análise dentro da janela de tempo
    const { data: proposals, error } = await supabase
      .from('propostas')
      .select('*')
      .eq('status', 'em análise')
      .gte('criado_em', ago120)
      .lte('criado_em', ago48)

    if (error) {
      throw error
    }

    
    if (proposals && proposals.length > 0) {
  // Detalhamento de propostas removido para evitar logs em build
    }

    // Buscar gestores
    const { data: gestors, error: gestorError } = await supabase
      .from('usuarios')
      .select('email')
      .eq('tipo_usuario', 'gestor')

    if (gestorError) {
      throw gestorError
    }


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
    return Response.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}
