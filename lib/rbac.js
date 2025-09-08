// RBAC centralizado
// Papéis suportados e escopo atualizado:
// gestor: vê tudo (acesso completo) — pode criar novas propostas
// gerente: tudo exceto gestão de usuários e relatórios
// analista_implantacao: tudo exceto movimentação, usuários e relatórios
// analista_movimentacao: acessa movimentação + dashboard e módulos genéricos; sem propostas, usuários e relatórios
// consultor: tudo exceto usuários e relatórios
// analista_cliente: suporte/atendimento ao cliente; acesso a dashboard (escopo próprio) + carteira de clientes (como consultor), SEM propostas e SEM movimentação

export const ROLES = Object.freeze([
  'gestor',
  'gerente',
  'analista_implantacao',
  'analista_movimentacao',
  'consultor',
  'analista_cliente'
])

// Mapa de permissões funcionais
export const PERMISSIONS = {
  // Dashboard: gestor e gerente veem visão completa; demais veem apenas sua própria.
  viewDashboardAll: new Set(['gestor','gerente']),
  viewDashboardOwn: new Set(['gestor','gerente','analista_implantacao','analista_movimentacao','consultor','analista_cliente']),

  // Gestão de usuários / relatórios
  manageUsers: new Set(['gestor']),
  viewRelatorios: new Set(['gestor']),

  // Propostas (analista_movimentacao não acessa; analista_implantacao acessa)
  viewPropostas: new Set(['gestor','gerente','analista_implantacao','consultor']), // analista_cliente e analista_movimentacao sem acesso
  createPropostas: new Set(['gestor','gerente','analista_implantacao','consultor']), // analista_cliente fora
  editPropostasStatus: new Set(['gestor','gerente','analista_implantacao']), // analista_cliente fora
  deletePropostas: new Set(['gestor']),
  uploadPropostaDocs: new Set(['gestor','gerente','analista_implantacao','consultor']),

  // Movimentação: incluir analista_movimentacao conforme nova regra
  viewMovimentacao: new Set(['gestor','gerente','consultor','analista_movimentacao']), // analista_cliente sem acesso
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
