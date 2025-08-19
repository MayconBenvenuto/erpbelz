import { describe, it, expect, vi } from 'vitest'

// Evita erro de env (supabaseUrl) ao importar helpers de API durante os testes
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      auth: {},
      from: () => ({ select: () => ({ data: [], error: null }) })
    }))
  }
})

// Testes básicos das rotas: validam handlers exportados e tipos

describe('API routes exports', () => {
  it('[[...path]] should export handlers', async () => {
    const mod = await import('@/app/api/[[...path]]/route.js')
    expect(typeof mod.GET).toBe('function')
    expect(typeof mod.POST).toBe('function')
    expect(typeof mod.PUT).toBe('function')
    expect(typeof mod.DELETE).toBe('function')
    expect(typeof mod.PATCH).toBe('function')
  })

  it('auth/login should export POST handler', async () => {
    const mod = await import('@/app/api/auth/login/route.js')
    expect(typeof mod.POST).toBe('function')
  })

  it('auth/logout should export POST handler', async () => {
    const mod = await import('@/app/api/auth/logout/route.js')
    expect(typeof mod.POST).toBe('function')
  })

  it('proposals routes should export handlers', async () => {
    const list = await import('@/app/api/proposals/route.js')
    const item = await import('@/app/api/proposals/[id]/route.js')
    expect(typeof list.GET).toBe('function')
    expect(typeof list.POST).toBe('function')
    expect(typeof item.PUT).toBe('function')
  })

  it('users/goals/sessions/validate-cnpj should export handlers', async () => {
    const users = await import('@/app/api/users/route.js')
    const goals = await import('@/app/api/goals/route.js')
    const sessions = await import('@/app/api/sessions/route.js')
    const validate = await import('@/app/api/validate-cnpj/route.js')
    expect(typeof users.GET).toBe('function')
    expect(typeof users.POST).toBe('function')
    expect(typeof goals.GET).toBe('function')
    expect(typeof sessions.GET).toBe('function')
    expect(typeof validate.POST).toBe('function')
  })
})

// [REMOVIDO] Teste legado do backend Next.js. Sem efeito após migração para Nest.js.
