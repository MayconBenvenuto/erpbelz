"use client"

/**
 * Header
 * @param {{
 *  activeTab: string,
 *  currentUser: { tipo_usuario: string },
 *  leftSlot?: React.ReactNode,
 *  rightSlot?: React.ReactNode
 * }} props
 */
import Image from "next/image"

export default function Header({ activeTab, currentUser, leftSlot, rightSlot }) {
  return (
  <header className="border-b bg-card shadow-sm sticky top-0 z-30 belz5-header">
      <div className="px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center gap-3">
          <div className="md:hidden">
            {leftSlot}
          </div>
          <Image src="/logo-belz.jpg" alt="Logo Belz" width={28} height={28} className="rounded md:hidden" />
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">
              {activeTab === 'propostas' && currentUser.tipo_usuario !== 'consultor' && (currentUser.tipo_usuario === 'gestor' ? 'Monitorar Propostas' : 'Gerenciar Propostas')}
              {activeTab === 'dashboard' && currentUser.tipo_usuario !== 'consultor' && 'Dashboard'}
              {activeTab === 'usuarios' && 'Gerenciar Usuários'}
              {activeTab === 'relatorios' && 'Relatórios e Monitoramento'}
              {activeTab === 'movimentacao' && 'Movimentação'}
            </h2>
            <p className="hidden sm:block text-sm text-muted-foreground mt-0.5">
              {activeTab === 'propostas' && currentUser.tipo_usuario !== 'consultor' && (currentUser.tipo_usuario === 'gestor' ? 'Monitore e gerencie o status de todas as propostas' : 'Crie e visualize suas propostas')}
              {activeTab === 'dashboard' && currentUser.tipo_usuario !== 'consultor' && 'Visão geral das métricas e indicadores'}
              {activeTab === 'usuarios' && 'Controle de usuários e permissões'}
              {activeTab === 'relatorios' && 'Análise de sessões e atividades'}
              {activeTab === 'movimentacao' && 'Acompanhe e registre movimentações'}
            </p>
          </div>
          {rightSlot && (
            <div className="ml-auto flex items-center gap-3">
              {rightSlot}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
