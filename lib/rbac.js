// RBAC centralizado
// Papéis suportados e escopo atualizado:
// gestor: vê tudo (acesso completo)
// gerente: tudo exceto gestão de usuários e relatórios
// analista_implantacao: tudo exceto movimentação, usuários e relatórios
// analista_movimentacao: tudo exceto propostas, movimentação, usuários e relatórios (resta dashboard + demais módulos genéricos)
// consultor: tudo exceto usuários e relatórios

export const ROLES = Object.freeze([
  'gestor',
  'gerente',
  'analista_implantacao',
  'analista_movimentacao',
  'consultor'
])

// Mapa de permissões funcionais
export const PERMISSIONS = {
  // Dashboard: gestor e gerente veem visão completa; demais veem apenas sua própria.
  viewDashboardAll: new Set(['gestor','gerente']),
  viewDashboardOwn: new Set(['gestor','gerente','analista_implantacao','analista_movimentacao','consultor']),

  // Gestão de usuários / relatórios
  manageUsers: new Set(['gestor']),
  viewRelatorios: new Set(['gestor']),

  // Propostas (analista_movimentacao não acessa; analista_implantacao acessa; todos menos analista_movimentacao)
  viewPropostas: new Set(['gestor','gerente','analista_implantacao','consultor']),
  createPropostas: new Set(['gestor','gerente','analista_implantacao','consultor']),
  editPropostasStatus: new Set(['gestor','gerente','analista_implantacao']),
  deletePropostas: new Set(['gestor']),
  uploadPropostaDocs: new Set(['gestor','gerente','analista_implantacao','consultor']),

  // Movimentação (analista_implantacao não; analista_movimentacao também não segundo regra solicitada)
  viewMovimentacao: new Set(['gestor','gerente','consultor']),
  createSolicitacao: new Set(['gestor','gerente','consultor'])
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
