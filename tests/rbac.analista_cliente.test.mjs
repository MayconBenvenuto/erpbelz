import { describe, it, expect } from 'vitest'
import { ROLES, PERMISSIONS, hasPermission } from '@/lib/rbac'

const fakeUser = (tipo_usuario) => ({ id: 'u-test', tipo_usuario })

describe('RBAC analista_cliente', () => {
  it('inclui analista_cliente na lista de ROLES', () => {
    expect(ROLES).toContain('analista_cliente')
  })
  it('não concede acesso a propostas nem movimentação', () => {
    const u = fakeUser('analista_cliente')
    expect(hasPermission(u,'viewPropostas')).toBe(false)
    expect(hasPermission(u,'viewMovimentacao')).toBe(false)
    expect(hasPermission(u,'createPropostas')).toBe(false)
  })
  it('mantém acesso ao dashboard own', () => {
  expect(PERMISSIONS.viewDashboardOwn.has('analista_cliente')).toBe(true)
  })
})
