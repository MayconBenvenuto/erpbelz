"use client"

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, LogOut, User } from 'lucide-react'

export default function TopUserActions({ currentUser, onRefresh, onLogout, isRefreshing = false }) {
  if (!currentUser) return null
  return (
    <div className="hidden md:flex items-stretch gap-3">
      <div className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl bg-card border border-border shadow-sm">
        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-primary shrink-0">
          <User className="w-5 h-5" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Usuário</p>
          <p className="text-sm font-semibold truncate">{currentUser.nome}</p>
        </div>
        <div className="flex flex-col items-end ml-2">
          <Badge variant={currentUser.tipo_usuario === 'gestor' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 capitalize">
            {currentUser.tipo_usuario}
          </Badge>
        </div>
        <div className="mx-2 w-px self-stretch bg-border/60" />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing} aria-label="Atualizar" title="Atualizar" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sair" title="Sair" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive hover:text-destructive-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
