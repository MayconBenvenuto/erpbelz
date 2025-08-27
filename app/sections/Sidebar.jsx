'use client'

/**
 * Sidebar
 * @param {{
 *  currentUser: { id: string, nome: string, tipo_usuario: 'gestor'|'analista'|'consultor' },
 *  activeTab: 'propostas'|'dashboard'|'usuarios'|'relatorios',
 *  setActiveTab: (tab: string) => void,
 *  onRefresh: () => void,
 *  onLogout: () => void,
 * }} props
 */

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, BarChart3, Users, TrendingUp, RefreshCw, LogOut, User, Repeat } from 'lucide-react'

export default function Sidebar({ currentUser, activeTab, setActiveTab, onRefresh, onLogout }) {
  return (
  <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-card border-r shadow-lg flex-col z-40" role="navigation" aria-label="Menu lateral">
      <div className="p-6 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10">
            <Image src="/logo-belz.jpg" alt="Logo Belz" width={40} height={40} className="rounded-lg object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary font-montserrat">Sistema de Gestão - Belz</h1>
            <p className="text-xs text-muted-foreground">&nbsp;</p>
          </div>
        </div>
      </div>

  <nav className="flex-1 p-4">
        <div className="space-y-2">
          {/* Dashboard: sempre a primeira opção para todos os perfis */}
          <button
            onClick={() => setActiveTab('dashboard')}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              activeTab === 'dashboard' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>

          {/* Propostas agora acessível para consultor (cria propostas) */}
          {true && (
            <button
              onClick={() => setActiveTab('propostas')}
              aria-current={activeTab === 'propostas' ? 'page' : undefined}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                activeTab === 'propostas' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Propostas</span>
            </button>
          )}

          {/* Seção Implantação removida */}

          {(currentUser.tipo_usuario === 'analista' || currentUser.tipo_usuario === 'consultor' || currentUser.tipo_usuario === 'gestor') && (
            <button
              onClick={() => setActiveTab('movimentacao')}
              aria-current={activeTab === 'movimentacao' ? 'page' : undefined}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                activeTab === 'movimentacao' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Repeat className="w-5 h-5" />
              <span className="font-medium">Movimentação</span>
            </button>
          )}

          {currentUser.tipo_usuario === 'gestor' && (
            <>
              <button
                onClick={() => setActiveTab('usuarios')}
                aria-current={activeTab === 'usuarios' ? 'page' : undefined}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  activeTab === 'usuarios' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">Usuários</span>
              </button>

              <button
                onClick={() => setActiveTab('relatorios')}
                aria-current={activeTab === 'relatorios' ? 'page' : undefined}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  activeTab === 'relatorios' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">Relatórios</span>
              </button>
            </>
          )}
        </div>
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
          <User className="w-8 h-8 p-2 bg-primary/10 rounded-full text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser.nome}</p>
            <Badge variant={currentUser.tipo_usuario === 'gestor' ? 'default' : 'secondary'} className="text-xs">
              {currentUser.tipo_usuario}
            </Badge>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <Button variant="outline" size="sm" onClick={onRefresh} className="w-full" aria-label="Atualizar dados">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={onLogout} className="w-full" aria-label="Sair da conta">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </aside>
  )
}
