"use client"

import Image from "next/image"
import { FileText, BarChart3, Users, TrendingUp, LogOut, RefreshCw, Repeat } from "lucide-react"
import { CheckSquare } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function MobileSidebar({ currentUser, activeTab, setActiveTab, onRefresh, onLogout }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menu">
          {/* Lucide Menu icon inline to avoid extra import */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="3" x2="21" y1="6" y2="6" />
            <line x1="3" x2="21" y1="12" y2="12" />
            <line x1="3" x2="21" y1="18" y2="18" />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85%] sm:max-w-xs p-0">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Image src="/logo-belz.jpg" alt="Logo Belz" width={36} height={36} className="rounded object-cover" />
            <div>
              <h1 className="text-base font-bold text-primary">Sistema de Gestão - Belz</h1>
              <p className="text-xs text-muted-foreground">&nbsp;</p>
            </div>
          </div>
        </div>

        <nav className="p-3" role="navigation" aria-label="Menu móvel">
          <div className="space-y-1">
            {/* Para gestor, Dashboard como primeira opção */}
            {currentUser?.tipo_usuario === 'gestor' && (
              <SheetClose asChild>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  aria-current={activeTab === 'dashboard' ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    activeTab === 'dashboard' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-medium">Dashboard</span>
                </button>
              </SheetClose>
            )}
            {currentUser?.tipo_usuario !== 'consultor' && (
              <SheetClose asChild>
                <button
                  onClick={() => setActiveTab('propostas')}
                  aria-current={activeTab === 'propostas' ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    activeTab === 'propostas' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Propostas</span>
                </button>
              </SheetClose>
            )}

            {/* Implantação (todos) */}
            <SheetClose asChild>
              <button
                onClick={() => setActiveTab('implantacao')}
                aria-current={activeTab === 'implantacao' ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  activeTab === 'implantacao' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <CheckSquare className="w-5 h-5" />
                <span className="font-medium">Implantação</span>
              </button>
            </SheetClose>

            {/* Para analista, Dashboard segue aqui; gestor já vê no topo */}
            {currentUser?.tipo_usuario !== 'consultor' && currentUser?.tipo_usuario !== 'gestor' && (
              <SheetClose asChild>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  aria-current={activeTab === 'dashboard' ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    activeTab === 'dashboard' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-medium">Dashboard</span>
                </button>
              </SheetClose>
            )}

            {(currentUser?.tipo_usuario === 'analista' || currentUser?.tipo_usuario === 'consultor' || currentUser?.tipo_usuario === 'gestor') && (
              <SheetClose asChild>
                <button
                  onClick={() => setActiveTab('movimentacao')}
                  aria-current={activeTab === 'movimentacao' ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    activeTab === 'movimentacao' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Repeat className="w-5 h-5" />
                  <span className="font-medium">Movimentação</span>
                </button>
              </SheetClose>
            )}

            {currentUser?.tipo_usuario === 'gestor' && (
              <>
                <SheetClose asChild>
                  <button
                    onClick={() => setActiveTab('usuarios')}
                    aria-current={activeTab === 'usuarios' ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      activeTab === 'usuarios' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    <span className="font-medium">Usuários</span>
                  </button>
                </SheetClose>

                <SheetClose asChild>
                  <button
                    onClick={() => setActiveTab('relatorios')}
                    aria-current={activeTab === 'relatorios' ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                      activeTab === 'relatorios' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    <span className="font-medium">Relatórios</span>
                  </button>
                </SheetClose>
              </>
            )}
          </div>
        </nav>

        <div className="p-3 border-t space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser?.nome}</p>
              <Badge variant={currentUser?.tipo_usuario === 'gestor' ? 'default' : 'secondary'} className="text-xs">
                {currentUser?.tipo_usuario}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onRefresh} aria-label="Atualizar" className="justify-center">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={onLogout} aria-label="Sair" className="justify-center">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
