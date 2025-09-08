import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase mock compartilhado (precisa ser o mesmo usado dentro do api-helpers mock)
function buildSupabaseMock() {
  return {
    from(table) {
      const executor = async () => {
        // eslint-disable-next-line no-console
        console.log('[TEST_SUPABASE_MOCK] query table=', table)
        if (table === 'propostas') {
          const past = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()
          return { data: [ { id: 'p1', codigo: 'PRP9999', cnpj: '11222333000181', consultor: 'Fulano', valor: 1234.56, status: 'em análise', criado_em: past } ], error: null }
        }
        if (table === 'usuarios') {
          return { data: [ { email: 'outrogestor@belz.com.br', nome: 'Gestor Sec' } ], error: null }
        }
        return { data: [], error: null }
      }
      const chain = {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        lte: () => chain,
        order: () => chain,
        then(resolve, reject) { return executor().then(resolve, reject) },
        catch(reject) { return executor().catch(reject) }
      }
      return chain
    }
  }
}
const supabaseMockInstance = buildSupabaseMock()

// Mock api-helpers antes de importar rota
vi.mock('@/lib/api-helpers', () => ({
  supabase: supabaseMockInstance,
  handleCORS: (r) => r,
  requireAuth: vi.fn(async () => ({ user: { id: 'u1', email: 'gestor@belz.com.br', tipo_usuario: 'gestor' } })),
  ensureGestor: () => null,
}))

// Mock envio de e-mail
const sendEmailMock = vi.fn(async ({ to, subject }) => ({ ok: true, to, subject }))
vi.mock('@/lib/email', () => ({
  sendEmail: sendEmailMock
}))

// (api-helpers já mockado acima)

// Mock helpers de auth para simular gestor
// (Substituído por mock acima)

// Mock template simples
vi.mock('@/lib/email-template', () => ({
  renderBrandedEmail: ({ title, contentHtml }) => `<h1>${title}</h1>${contentHtml}`
}))

// Utils reais ok

// Config vars
process.env.PRIMARY_GESTOR_EMAIL = 'mayconbenvenuto@belzseguros.com.br'
process.env.STALE_PROPOSAL_ALERT_HOURS = '24'

// Helper para criar Request mínima
function makeRequest() {
  return new Request('http://localhost/api/alerts/proposals/stale', {
    method: 'GET',
    headers: new Headers({ 'origin': 'http://localhost:3000' })
  })
}

describe('alerts stale proposals endpoint', () => {
  let mod
  beforeEach(async () => {
    mod = await import('@/app/api/alerts/proposals/stale/route.js')
  })

  it('deve incluir PRIMARY_GESTOR_EMAIL nos destinatários e retornar dados', async () => {
    const res = await mod.GET(makeRequest())
    const json = await res.json()
    expect(json.proposals_found).toBeGreaterThan(0)
    expect(sendEmailMock.mock.calls.length).toBeGreaterThan(0)
    const destinatariosChamados = sendEmailMock.mock.calls.map(c => c[0].to)
    expect(destinatariosChamados).toContain(process.env.PRIMARY_GESTOR_EMAIL)
    const subjects = sendEmailMock.mock.calls.map(c => c[0].subject)
    expect(subjects.some(s => /24h\+/.test(s))).toBe(true)
  })
})
