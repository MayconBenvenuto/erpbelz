import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function buildSupabase(options) {
  const {
    selectResult = { data: [], error: null },
    storageList = [],
    publicUrl = 'https://files.example/doc.pdf',
    signedUrl = 'https://files.example/doc.pdf?token=signed',
  } = options

  const order = vi.fn(async () => selectResult)
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))

  const list = vi.fn(async () => ({ data: storageList, error: null }))
  const getPublicUrl = vi.fn(() => ({ data: { publicUrl }, publicUrl }))
  const createSignedUrl = vi.fn(async () => ({ data: { signedUrl }, signedUrl, error: null }))

  return {
    from,
    storage: {
      from: () => ({ list, getPublicUrl, createSignedUrl })
    },
    __mocks: { order, eq, select, from, list, getPublicUrl, createSignedUrl }
  }
}

describe('proposals files route', () => {
  let supabaseMock
  const baseConfig = { hasUrl: true, hasAnonKey: true, hasServiceRoleKey: false }

  beforeEach(() => {
    vi.resetModules()
    supabaseMock = buildSupabase({})
    vi.doMock('@/lib/api-helpers', () => ({
      supabase: supabaseMock,
      handleCORS: (res) => res,
      requireAuth: async () => ({ user: { id: 'user-1', tipo_usuario: 'gestor' } }),
      mapSupabaseErrorToStatus: () => 500,
      supabaseConfigStatus: () => baseConfig,
    }))
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))
    vi.doMock('node:crypto', () => ({ randomUUID: () => 'uuid-test' }))
  })

  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('responde 503 quando url ou anon key ausentes', async () => {
    vi.doMock('@/lib/api-helpers', () => ({
      supabase: supabaseMock,
      handleCORS: (res) => res,
      requireAuth: async () => ({ user: { id: 'user-1', tipo_usuario: 'gestor' } }),
      mapSupabaseErrorToStatus: () => 500,
      supabaseConfigStatus: () => ({ hasUrl: false, hasAnonKey: false, hasServiceRoleKey: false }),
    }))

    const { GET } = await import('@/app/api/proposals/files/route.js')
    const res = await GET(new Request('http://localhost/api/proposals/files?proposta_id=abc'))
    expect(res.status).toBe(503)
  })

  it('retorna dados do banco quando metadados existem', async () => {
    supabaseMock = buildSupabase({
      selectResult: {
        data: [
          { id: 'f1', proposta_id: 'abc', nome_original: 'doc.pdf', path: 'abc/doc.pdf', bucket: 'implantacao_upload', tamanho_bytes: 10 },
        ],
        error: null,
      },
    })

    vi.doMock('@/lib/api-helpers', () => ({
      supabase: supabaseMock,
      handleCORS: (res) => res,
      requireAuth: async () => ({ user: { id: 'user-1', tipo_usuario: 'gestor' } }),
      mapSupabaseErrorToStatus: () => 500,
      supabaseConfigStatus: () => baseConfig,
    }))

    const { GET } = await import('@/app/api/proposals/files/route.js')
    const res = await GET(new Request('http://localhost/api/proposals/files?proposta_id=abc'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data[0]).toMatchObject({ id: 'f1', nome_original: 'doc.pdf' })
    expect(body.data[0].url).toBeDefined()
    expect(body.data[0].proxy_url).toBeDefined()
    expect(body.data[0].download_url).toMatch(/download=1/)
  })
})
