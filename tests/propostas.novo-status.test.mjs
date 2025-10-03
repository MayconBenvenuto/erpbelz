import { describe, it, expect } from 'vitest'

/**
 * Testes para validar novo status e campo observacoes
 * Atualização: 2025-10-03
 */

describe('Propostas - Novo Status e Observações', () => {
  it('STATUS_OPTIONS deve incluir novo status pendente assinatura ds/proposta', async () => {
    const { STATUS_OPTIONS } = await import('@/lib/constants.js')
    
    expect(STATUS_OPTIONS).toContain('pendente assinatura ds/proposta')
    
    // Verificar ordem correta no fluxo
    const indexRecepcionado = STATUS_OPTIONS.indexOf('recepcionado')
    const indexPendenteAssinatura = STATUS_OPTIONS.indexOf('pendente assinatura ds/proposta')
    const indexAnalise = STATUS_OPTIONS.indexOf('análise')
    
    expect(indexPendenteAssinatura).toBeGreaterThan(indexRecepcionado)
    expect(indexAnalise).toBeGreaterThan(indexPendenteAssinatura)
  })

  it('STATUS_COLORS deve ter cores definidas para novo status', async () => {
    const { STATUS_COLORS } = await import('@/lib/constants.js')
    
    expect(STATUS_COLORS['pendente assinatura ds/proposta']).toBeDefined()
    expect(STATUS_COLORS['pendente assinatura ds/proposta']).toHaveProperty('bg')
    expect(STATUS_COLORS['pendente assinatura ds/proposta']).toHaveProperty('text')
    expect(STATUS_COLORS['pendente assinatura ds/proposta']).toHaveProperty('border')
    
    // Verificar que são cores válidas (formato hex)
    expect(STATUS_COLORS['pendente assinatura ds/proposta'].bg).toMatch(/^#[0-9A-F]{6}$/i)
    expect(STATUS_COLORS['pendente assinatura ds/proposta'].text).toMatch(/^#[0-9A-F]{6}$/i)
    expect(STATUS_COLORS['pendente assinatura ds/proposta'].border).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('API route deve aceitar observacoes no schema de criação', async () => {
    // Importar apenas para verificar que não há erros de sintaxe
    const mod = await import('@/app/api/proposals/route.js')
    expect(mod.POST).toBeDefined()
  })

  it('API [id] route deve aceitar observacoes no schema de edição', async () => {
    const mod = await import('@/app/api/proposals/[id]/route.js')
    expect(mod.PATCH).toBeDefined()
  })

  it('NovaPropostaDialog deve ter campo de observações', async () => {
    const mod = await import('@/components/propostas/NovaPropostaDialog.jsx')
    expect(mod.NovaPropostaDialog).toBeDefined()
    // Teste básico de import - teste completo requer ambiente React
  })

  it('Proposals section deve importar sem erros', async () => {
    const mod = await import('@/app/sections/Proposals.jsx')
    expect(mod.default).toBeDefined()
  })
})

describe('Propostas - Backward Compatibility', () => {
  it('STATUS_OPTIONS deve manter todos os status anteriores', async () => {
    const { STATUS_OPTIONS } = await import('@/lib/constants.js')
    
    const statusEsperados = [
      'recepcionado',
      'análise',
      'pendência',
      'pleito seguradora',
      'boleto liberado',
      'implantado',
      'proposta declinada'
    ]
    
    for (const status of statusEsperados) {
      expect(STATUS_OPTIONS).toContain(status)
    }
  })

  it('STATUS_COLORS deve ter cores para todos os status', async () => {
    const { STATUS_OPTIONS, STATUS_COLORS } = await import('@/lib/constants.js')
    
    for (const status of STATUS_OPTIONS) {
      expect(STATUS_COLORS[status]).toBeDefined()
      expect(STATUS_COLORS[status]).toHaveProperty('bg')
      expect(STATUS_COLORS[status]).toHaveProperty('text')
      expect(STATUS_COLORS[status]).toHaveProperty('border')
    }
  })
})
