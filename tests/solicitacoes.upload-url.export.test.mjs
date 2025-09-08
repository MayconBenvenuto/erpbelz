import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ storage: { from: () => ({ createSignedUploadUrl: () => ({ data: { token: 't', signedUrl: 'u' }, error: null }) }) } }) ) }))

// Mock helpers para não exigir env real
vi.mock('@/lib/api-helpers', () => ({
  supabase: {
    storage: {
      from: () => ({ createSignedUploadUrl: () => ({ data: { token: 't', signedUrl: 'u' }, error: null }) })
    }
  }
}))

vi.mock('@/lib/security', () => ({ verifyToken: () => ({ userId: 'u1', email: 'a@b', tipo: 'gestor' }), sanitizeForLog: (o)=>o }))

describe('upload-url route', () => {
  it('should export POST handler', async () => {
    const mod = await import('@/app/api/solicitacoes/upload-url/route.js')
    expect(typeof mod.POST).toBe('function')
  })
})
