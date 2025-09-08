'use client'

/**
 * Sidebar
 * @param {{
 *  currentUser: { id: string, nome: string, tipo_usuario: string },
 *  activeTab: 'propostas'|'dashboard'|'usuarios'|'relatorios',
 *  setActiveTab: (tab: string) => void,
 *  onRefresh: () => void,
 *  onLogout: () => void,
 * }} props
 */

import Image from 'next/image'
import { FileText, BarChart3, Users, TrendingUp, Repeat, Briefcase, Calculator, DollarSign, Workflow, Cpu, GraduationCap, Target, FolderKanban, ExternalLink, Phone } from 'lucide-react'
import { hasPermission } from '@/lib/rbac'
import { useEffect, useRef } from 'react'
import { queryClient, queryKeys } from '@/lib/query-client'
import { preloadProposalsSection, preloadReportsSection, preloadMovimentacaoSection, preloadUsersSection, preloadDashboardSection } from '@/components/lazy-sections'

function usePrefetchOnHover() {
  const scheduled = useRef(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (scheduled.current) return
    scheduled.current = true
    // Em idle, pré-carrega dados mais prováveis para reduzir TTI das abas
  if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        try {
      queryClient.prefetchQuery({ queryKey: queryKeys.dashboardStats, queryFn: async () => (await (await fetch('/api/reports/dashboard')).json()) })
      queryClient.prefetchQuery({ queryKey: queryKeys.proposals, queryFn: async () => (await (await fetch('/api/proposals?fields=list&page=1&pageSize=50')).json()) })
      queryClient.prefetchQuery({ queryKey: queryKeys.users, queryFn: async () => (await (await fetch('/api/users')).json()) })
      queryClient.prefetchQuery({ queryKey: queryKeys.solicitacoes, queryFn: async () => (await (await fetch('/api/solicitacoes?fields=list&page=1&pageSize=50')).json()) })
        } catch {}
      })
    }
  }, [])
}

export default function Sidebar({ currentUser, activeTab, setActiveTab }) {
  usePrefetchOnHover()

  const prefetchPropostas = () => {
    preloadProposalsSection();
    try { queryClient.prefetchQuery({ queryKey: queryKeys.proposals, queryFn: async () => (await (await fetch('/api/proposals?fields=list&page=1&pageSize=50')).json()) }) } catch {}
  }
  const prefetchDashboard = () => {
    preloadDashboardSection();
    try { queryClient.prefetchQuery({ queryKey: queryKeys.dashboardStats, queryFn: async () => (await (await fetch('/api/reports/dashboard')).json()) }) } catch {}
  }
  const prefetchMovimentacao = () => {
    preloadMovimentacaoSection();
    try { queryClient.prefetchQuery({ queryKey: queryKeys.solicitacoes, queryFn: async () => (await (await fetch('/api/solicitacoes?fields=list&page=1&pageSize=50')).json()) }) } catch {}
  }
  const prefetchUsuarios = () => {
    preloadUsersSection();
    try { queryClient.prefetchQuery({ queryKey: queryKeys.users, queryFn: async () => (await (await fetch('/api/users')).json()) }) } catch {}
  }
  const prefetchRelatorios = () => {
    preloadReportsSection();
    try { queryClient.prefetchQuery({ queryKey: queryKeys.reports, queryFn: async () => (await (await fetch('/api/reports')).json()) }) } catch {}
  }
  return (
  <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-card border-r border-border shadow-lg flex-col z-40" role="navigation" aria-label="Menu lateral">
      <div className="p-6 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10">
            <Image src="/logo-belz.jpg" alt="Logo Belz" width={40} height={40} className="rounded-lg object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-montserrat">Sistema de Gestão - Belz</h1>
            <p className="text-xs text-muted-foreground">&nbsp;</p>
          </div>
        </div>
      </div>

  <nav className="flex-1 p-4 overflow-y-auto belz5-sidebar-scroll">
        <div className="space-y-2">
          {/* Para analista_movimentacao: Movimentação fica no topo */}
          {currentUser?.tipo_usuario === 'analista_movimentacao' && hasPermission(currentUser,'viewMovimentacao') && (
            <button
              onClick={() => setActiveTab('movimentacao')}
              aria-current={activeTab === 'movimentacao' ? 'page' : undefined}
              className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'movimentacao' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}
            >
              <Repeat className="w-5 h-5" />
              <span className="font-medium">Movimentação</span>
            </button>
          )}
          {/* Dashboard: sempre a primeira opção para todos os perfis */}
          <button
            onMouseEnter={prefetchDashboard}
            onFocus={prefetchDashboard}
            onClick={() => setActiveTab('dashboard')}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'dashboard' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>

          {/* Propostas */}
          {/* Propostas indisponível para analista_cliente */}
      {hasPermission(currentUser,'viewPropostas') && currentUser?.tipo_usuario !== 'analista_cliente' && (
            <button
        onMouseEnter={prefetchPropostas}
        onFocus={prefetchPropostas}
        onClick={() => setActiveTab('propostas')}
              aria-current={activeTab === 'propostas' ? 'page' : undefined}
              className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'propostas' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Propostas</span>
            </button>
          )}

          {/* Novas seções em desenvolvimento - apenas navegação; permissões futuras podem ser aplicadas */}
          {currentUser?.tipo_usuario === 'gestor' && (
            <>
              <button onClick={() => setActiveTab('simulador')} aria-current={activeTab === 'simulador' ? 'page' : undefined} className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'simulador' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}>
                <Calculator className="w-5 h-5" /><span className="font-medium">Simulador</span>
              </button>
              <button onClick={() => setActiveTab('financeiro')} aria-current={activeTab === 'financeiro' ? 'page' : undefined} className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'financeiro' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}>
                <DollarSign className="w-5 h-5" /><span className="font-medium">Financeiro</span>
              </button>
              <button onClick={() => setActiveTab('processos')} aria-current={activeTab === 'processos' ? 'page' : undefined} className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'processos' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}>
                <Workflow className="w-5 h-5" /><span className="font-medium">Processos</span>
              </button>
              <button onClick={() => setActiveTab('ia-belz')} aria-current={activeTab === 'ia-belz' ? 'page' : undefined} className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'ia-belz' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}>
                <Cpu className="w-5 h-5" /><span className="font-medium">IA Belz</span>
              </button>
              <button onClick={() => setActiveTab('universidade')} aria-current={activeTab === 'universidade' ? 'page' : undefined} className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'universidade' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}>
                <GraduationCap className="w-5 h-5" /><span className="font-medium">Universidade</span>
              </button>
              <button onClick={() => setActiveTab('leads')} aria-current={activeTab === 'leads' ? 'page' : undefined} className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'leads' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}>
                <Target className="w-5 h-5" /><span className="font-medium">Leads</span>
              </button>
              <button onClick={() => setActiveTab('materiais')} aria-current={activeTab === 'materiais' ? 'page' : undefined} className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'materiais' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}>
                <FolderKanban className="w-5 h-5" /><span className="font-medium">Materiais</span>
              </button>
              <button onClick={() => setActiveTab('portal-cliente')} aria-current={activeTab === 'portal-cliente' ? 'page' : undefined} className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'portal-cliente' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}>
                <ExternalLink className="w-5 h-5" /><span className="font-medium">Portal Cliente</span>
              </button>
              <button onClick={() => setActiveTab('contatos')} aria-current={activeTab === 'contatos' ? 'page' : undefined} className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'contatos' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}>
                <Phone className="w-5 h-5" /><span className="font-medium">Contatos</span>
              </button>
            </>
          )}

          {/* Seção Implantação removida */}

      {currentUser?.tipo_usuario !== 'analista_movimentacao' && currentUser?.tipo_usuario !== 'analista_cliente' && hasPermission(currentUser,'viewMovimentacao') && (
            <button
        onMouseEnter={prefetchMovimentacao}
        onFocus={prefetchMovimentacao}
        onClick={() => setActiveTab('movimentacao')}
              aria-current={activeTab === 'movimentacao' ? 'page' : undefined}
              className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'movimentacao' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}
            >
              <Repeat className="w-5 h-5" />
              <span className="font-medium">Movimentação</span>
            </button>
          )}

          {/* Carteira de Clientes: consultor, gestor e analista_cliente */}
          {['consultor','gestor','analista_cliente'].includes(currentUser?.tipo_usuario) && (
            <button
              onClick={() => setActiveTab('carteira')}
              aria-current={activeTab === 'carteira' ? 'page' : undefined}
              className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'carteira' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}
            >
              <Briefcase className="w-5 h-5" />
              <span className="font-medium">Carteira de Clientes</span>
            </button>
          )}

          {(hasPermission(currentUser,'manageUsers') || hasPermission(currentUser,'viewRelatorios')) && (
            <>
              {hasPermission(currentUser,'manageUsers') && (
              <button
                onMouseEnter={prefetchUsuarios}
                onFocus={prefetchUsuarios}
                onClick={() => setActiveTab('usuarios')}
                aria-current={activeTab === 'usuarios' ? 'page' : undefined}
                className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'usuarios' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">Usuários</span>
              </button>
              )}
        {hasPermission(currentUser,'viewRelatorios') && (
                <button
          onMouseEnter={prefetchRelatorios}
          onFocus={prefetchRelatorios}
          onClick={() => setActiveTab('relatorios')}
                  aria-current={activeTab === 'relatorios' ? 'page' : undefined}
                  className={`belz5-sidebar-item w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${activeTab === 'relatorios' ? 'belz5-sidebar-item-active' : 'text-gray-300'}`}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">Relatórios</span>
                </button>
              )}
            </>
          )}
        </div>
      </nav>
  {/* Bloco de usuário movido para o topo direito (TopUserActions). Mantido espaço final mínimo */}
  <div className="h-4" />
    </aside>
  )
}
