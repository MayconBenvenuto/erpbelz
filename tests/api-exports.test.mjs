import { describe, it, expect, vi } from 'vitest'

// Evita erro de env (supabaseUrl) ao importar helpers de API durante os testes
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      auth: {},
      from: () => ({ select: () => ({ data: [], error: null }) }),
      storage: { from: () => ({ list: () => ({ data: [], error: null }) }) }
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
    expect(typeof item.PATCH).toBe('function')
  })

  it('proposals metadata routes should export handlers', async () => {
    const notes = await import('@/app/api/proposals/notes/route.js')
    const tags = await import('@/app/api/proposals/tags/route.js')
    const files = await import('@/app/api/proposals/files/route.js')
    expect(typeof notes.GET).toBe('function')
    expect(typeof notes.POST).toBe('function')
    expect(typeof tags.GET).toBe('function')
    expect(typeof tags.POST).toBe('function')
    expect(typeof files.GET).toBe('function')
    expect(typeof files.POST).toBe('function')
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
    vi.resetModules()
  })

  it('users POST should allow creating gestor (schema)', async () => {
    // Garante isolamento: limpa cache de módulos antes de mockar e importar
    vi.resetModules()

    // Injeta mocks necessários ANTES da importação da rota
    vi.doMock('@/lib/api-helpers', () => ({
      __esModule: true,
      supabase: {
        from: () => ({
          insert: () => ({ select: () => ({ single: () => ({ data: { id: 'u2', nome: 'Novo Gestor', email: 'novo@belz.com.br', tipo_usuario: 'gestor', must_change_password: true }, error: null }) }) })
        })
      },
      handleCORS: (r) => r,
      requireAuth: vi.fn(async () => ({ user: { id: 'u1', email: 'gestor@belz.com.br', tipo_usuario: 'gestor' } })),
      cacheJson: (_req, _origin, payload) => new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }))

    const route = await import('@/app/api/users/route.js')
    expect(typeof route.POST).toBe('function')
    const req = new Request('http://localhost/api/users', {
      method: 'POST',
      headers: new Headers({ 'content-type': 'application/json', 'origin': 'http://localhost:3000', 'authorization': 'Bearer fake' }),
      body: JSON.stringify({ nome: 'Novo Gestor', email: 'novo@belz.com.br', senha: '123456', tipo_usuario: 'gestor' })
    })
    const res = await route.POST(req)
    expect(res.status).toBeLessThan(400)
    const json = await res.json()
    expect(json.tipo_usuario).toBe('gestor')
    vi.unmock('@/lib/api-helpers')
    vi.resetModules()
  })
})

describe('supabase helpers', () => {
  it('supabaseConfigStatus should reflect environment flags', async () => {
    vi.resetModules()
    vi.unmock('@/lib/api-helpers')
    vi.unstubAllEnvs()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')

    // Reaplica mock do supabase após reset
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {},
        from: () => ({ select: () => ({ data: [], error: null }) })
      }))
    }))

  const helpers = await vi.importActual('@/lib/api-helpers')
    const status = helpers.supabaseConfigStatus()

    expect(status).toMatchObject({
      hasUrl: true,
      hasAnonKey: true,
      hasServiceRoleKey: true,
      urlHost: 'example.supabase.co',
      isExampleUrl: true
    })

    vi.unstubAllEnvs()
  })
})

// [REMOVIDO] Teste legado do backend Next.js. Sem efeito após migração para Nest.js.
