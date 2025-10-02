import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const buildSupabase = ({ blob }) => {
  const download = vi.fn(async () => ({ data: blob, error: null }))
  const getPublicUrl = vi.fn(() => ({ data: { publicUrl: null } }))
  const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: 'https://files.example/doc.pdf?token=signed' }, error: null }))

  return {
    storage: {
      from: () => ({ download, getPublicUrl, createSignedUrl })
    },
    __mocks: { download, getPublicUrl, createSignedUrl }
  }
}

describe('proposals files proxy route', () => {
  let supabaseMock

  beforeEach(() => {
    vi.resetModules()
    const blob = new Blob(['hello'], { type: 'text/plain' })
    supabaseMock = buildSupabase({ blob })

    vi.doMock('@/lib/api-helpers', () => ({
      supabase: supabaseMock,
      handleCORS: (res) => res,
      requireAuth: async () => ({ user: { id: 'user-1' } }),
      mapSupabaseErrorToStatus: () => 500,
      supabaseConfigStatus: () => ({ hasUrl: true, hasAnonKey: true }),
    }))
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))
    vi.doMock('@/lib/security', () => ({ sanitizeForLog: (value) => value }))
  })

  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('retorna arquivo quando download=1', async () => {
    const { GET } = await import('@/app/api/proposals/files/proxy/route.js')
    const res = await GET(new Request('http://localhost/api/proposals/files/proxy?bucket=implantacao_upload&path=abc%2Fdoc.pdf&download=1'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/plain')
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    const buffer = Buffer.from(await res.arrayBuffer())
    expect(buffer.toString('utf-8')).toBe('hello')
    expect(supabaseMock.__mocks.download).toHaveBeenCalled()
  })
})
