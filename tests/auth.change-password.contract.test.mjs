import { describe, it, expect, vi } from 'vitest'
// Este é um teste de contrato superficial que valida shape esperado das respostas (mock supabase)
// Em ambiente real, usar testes de integração separados.
import * as security from '@/lib/security'

vi.mock('@/lib/api-helpers', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { id: 'u1', senha: await security.hashPassword('Temp1234'), must_change_password: true }, error: null })),
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }))
    }))
  },
  handleCORS: (resp) => resp,
  requireAuth: vi.fn(async () => ({ user: { id: 'u1' } }))
}))

describe('change-password route (contract)', () => {
  it('troca primeira senha exigindo política', async () => {
    const { POST } = await import('@/app/api/auth/change-password/route.js')
    const req = new Request('http://localhost/api/auth/change-password', { method: 'POST', body: JSON.stringify({ nova: 'NovaSenha1' }) })
    const res = await POST(req)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})
