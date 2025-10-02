import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const createSignedUploadUrlMock = vi.fn()

async function loadRoute(options = {}) {
  const {
    serviceKey = 'srv-key',
    verifyTokenResult = { userId: 'user-123', email: 'gestor@belz.com.br', tipo: 'gestor' },
    uploadResult = { data: { token: 'tok', signedUrl: 'url' }, error: null },
  } = options

  createSignedUploadUrlMock.mockImplementation(() => uploadResult)

  if (serviceKey !== null) {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', serviceKey)
  }
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
      storage: {
        from: () => ({ createSignedUploadUrl: createSignedUploadUrlMock })
      }
    }))
  }))

  vi.doMock('@/lib/api-helpers', () => ({
    supabase: {
      storage: {
        from: () => ({ createSignedUploadUrl: createSignedUploadUrlMock })
      }
    }
  }))

  vi.doMock('@/lib/security', () => ({
    verifyToken: () => verifyTokenResult,
    sanitizeForLog: (value) => value,
  }))

  vi.doMock('node:crypto', () => ({ randomUUID: () => 'fixed-uuid' }))

  vi.spyOn(Date, 'now').mockReturnValue(1700000000000)

  return import('@/app/api/solicitacoes/upload-url/route.js')
}

describe('solicitacoes upload-url route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    createSignedUploadUrlMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('gera URL assinada válida quando payload ok', async () => {
    const { POST } = await loadRoute()
    const req = new Request('http://localhost/api/solicitacoes/upload-url', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: JSON.stringify({ filename: 'documento.pdf', mime: 'application/pdf', size: 1024 })
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const payload = await res.json()
    expect(payload.bucket).toBe('movimentacao_upload')
    expect(payload.path).toBe('user-123/1700000000000-fixed-uuid.pdf')
    expect(createSignedUploadUrlMock).toHaveBeenCalledWith('user-123/1700000000000-fixed-uuid.pdf', 60)
  })

  it('retorna 400 para MIME inválido', async () => {
    const { POST } = await loadRoute()
    const req = new Request('http://localhost/api/solicitacoes/upload-url', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: JSON.stringify({ filename: 'script.exe', mime: 'application/x-msdownload', size: 1024 })
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled()
  })

  it('retorna 500 quando service role key ausente', async () => {
    const { POST } = await loadRoute({ serviceKey: '' })
    const req = new Request('http://localhost/api/solicitacoes/upload-url', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer token',
      },
      body: JSON.stringify({ filename: 'documento.pdf', mime: 'application/pdf', size: 1024 })
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled()
  })
})
