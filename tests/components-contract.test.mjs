import { describe, it, expect } from 'vitest'

// Teste de contrato simplificado: ProposalsSection espera props essenciais

describe('components contract', () => {
  it('ProposalsSection should be importable and a function', async () => {
    const mod = await import('@/app/sections/Proposals.jsx')
    expect(typeof mod.default).toBe('function')
  })

  it('DashboardSection should be importable and a function', async () => {
    const mod = await import('@/app/sections/Dashboard.jsx')
    expect(typeof mod.default).toBe('function')
  })
})
