// RBAC centralizado
// Novos papéis suportados:
// - gestor (acesso completo)
// - gerente (propostas + movimentação, dashboards de todos os analistas)
// - analista_implantacao (somente propostas + dashboard próprio)
// - analista_movimentacao (somente movimentação + dashboard próprio)
// - consultor (propostas + movimentação, apenas dashboard próprio)

export const ROLES = Object.freeze([
  'gestor',
  'gerente',
  'analista_implantacao',
  'analista_movimentacao',
  'consultor'
])

// Mapa de permissões funcionais
export const PERMISSIONS = {
  viewDashboardAll: new Set(['gestor','gerente']),
  viewDashboardOwn: new Set(['gestor','gerente','analista_implantacao','analista_movimentacao','consultor']),
  manageUsers: new Set(['gestor']),
  viewPropostas: new Set(['gestor','gerente','analista_implantacao','consultor']),
  editPropostasStatus: new Set(['gestor','gerente','analista_implantacao']),
  deletePropostas: new Set(['gestor']),
  viewMovimentacao: new Set(['gestor','gerente','analista_movimentacao','consultor']),
  createSolicitacao: new Set(['gestor','gerente','analista_movimentacao','consultor']),
  uploadPropostaDocs: new Set(['gestor','gerente','analista_implantacao','consultor'])
}

export function hasPermission(user, perm) {
  if (!user) return false
  const tipo = user.tipo_usuario || user.tipo
  const set = PERMISSIONS[perm]
  return !!set && set.has(tipo)
}

export function roleIsAnalyst(tipo) {
  return ['analista_implantacao','analista_movimentacao'].includes(tipo)
}
