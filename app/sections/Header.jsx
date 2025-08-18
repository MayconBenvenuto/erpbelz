'use client'

/**
 * Header
 * @param {{ activeTab: 'propostas'|'dashboard'|'usuarios'|'relatorios', currentUser: { tipo_usuario: string } }} props
 */
export default function Header({ activeTab, currentUser }) {
  return (
    <header className="border-b bg-card shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {activeTab === 'propostas' && (currentUser.tipo_usuario === 'gestor' ? 'Monitorar Propostas' : 'Gerenciar Propostas')}
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'usuarios' && 'Gerenciar Usuários'}
              {activeTab === 'relatorios' && 'Relatórios e Monitoramento'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === 'propostas' && (currentUser.tipo_usuario === 'gestor' ? 'Monitore e gerencie o status de todas as propostas' : 'Crie e visualize suas propostas')}
              {activeTab === 'dashboard' && 'Visão geral das métricas e indicadores'}
              {activeTab === 'usuarios' && 'Controle de usuários e permissões'}
              {activeTab === 'relatorios' && 'Análise de sessões e atividades'}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
