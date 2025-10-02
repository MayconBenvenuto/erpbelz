'use client'
'use client'

import { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { RefreshCw, LogOut, User, MoreHorizontal, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

export default function TopUserActions({ currentUser, onRefresh, onLogout, isRefreshing = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showPwdDialog, setShowPwdDialog] = useState(false)
  const [pwdForm, setPwdForm] = useState({ atual: '', nova: '', confirm: '' })
  const [submitting, setSubmitting] = useState(false)
  const containerRef = useRef(null)

  // Força abertura na primeira sessão se for obrigatório
  useEffect(() => {
    if (currentUser?.must_change_password && !showPwdDialog) {
      setShowPwdDialog(true)
    }
  }, [currentUser?.must_change_password, showPwdDialog])

  // Fecha o dialog se o usuário não precisa mais trocar a senha
  useEffect(() => {
    if (!currentUser?.must_change_password && showPwdDialog) {
      setShowPwdDialog(false)
    }
  }, [currentUser?.must_change_password, showPwdDialog])

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuOpen && containerRef.current && !containerRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  if (!currentUser) return null

  const validateNova = (s) => {
    if (s.length < 8) return 'Mínimo 8 caracteres'
    if (!/[A-ZÁÉÍÓÚÂÊÔÃÕÄËÏÖÜ]/.test(s)) return 'Precisa de letra maiúscula'
    if (!/[a-záéíóúâêôãõäëïöü]/.test(s)) return 'Precisa de letra minúscula'
    if (!/\d/.test(s)) return 'Precisa de dígito'
    return null
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    const err = validateNova(pwdForm.nova)
    if (err) {
      toast.error(err)
      return
    }
    if (pwdForm.nova !== pwdForm.confirm) {
      toast.error('Confirmação não bate')
      return
    }
    setSubmitting(true)
    try {
      const payload = currentUser.must_change_password
        ? { nova: pwdForm.nova, atual: pwdForm.atual || undefined }
        : { atual: pwdForm.atual, nova: pwdForm.nova }
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('erp_token') || sessionStorage.getItem('crm_token') || ''}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Falha na troca')
        return
      }
      toast.success('Senha alterada com sucesso')
      setPwdForm({ atual: '', nova: '', confirm: '' })
      // Refresh dados usuário antes de fechar o dialog
      try {
        const result = await onRefresh?.()
        // Se refresh bem sucedido e usuário não precisa mais trocar senha, fecha dialog
        if (result?.ok && result?.user && !result.user.must_change_password) {
          setShowPwdDialog(false)
        }
      } catch {}
      // Fechar dialog após refresh (must_change_password será false se sucesso)
      setShowPwdDialog(false)
    } catch {
      toast.error('Erro de rede')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="hidden md:flex items-stretch gap-3" ref={containerRef}>
      <div className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl bg-card border border-border shadow-sm relative">
        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-primary shrink-0">
          <User className="w-5 h-5" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Usuário
          </p>
          <p className="text-sm font-semibold truncate" title={currentUser.email}>
            {currentUser.nome}
          </p>
        </div>
        <div className="flex flex-col items-end ml-2">
          <Badge
            variant={currentUser.tipo_usuario === 'gestor' ? 'default' : 'secondary'}
            className="text-[10px] px-1.5 py-0 capitalize"
          >
            {currentUser.tipo_usuario.replace(/_/g, ' ')}
          </Badge>
        </div>
        <div className="mx-2 w-px self-stretch bg-border/60" />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Atualizar"
            title="Atualizar"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mais ações"
            title="Mais ações"
            onClick={() => setMenuOpen((o) => !o)}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
        {menuOpen && (
          <div className="absolute top-full right-2 mt-2 w-48 rounded-md border bg-popover shadow-lg z-50 p-1 animate-in fade-in-0 zoom-in-95">
            <button
              onClick={() => {
                setMenuOpen(false)
                setShowPwdDialog(true)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted/60 text-left text-primary"
            >
              <KeyRound className="w-4 h-4" /> Trocar Senha
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                onLogout?.()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive/10 text-destructive"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        )}
      </div>

      <Dialog
        open={showPwdDialog}
        onOpenChange={(o) => {
          if (!currentUser.must_change_password) setShowPwdDialog(o)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              {currentUser.must_change_password
                ? 'Defina sua senha pessoal para continuar.'
                : 'Atualize sua senha com segurança.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {!currentUser.must_change_password && (
              <div className="space-y-1">
                <Label htmlFor="pwd-atual">Senha Atual</Label>
                <Input
                  id="pwd-atual"
                  type="password"
                  autoComplete="current-password"
                  value={pwdForm.atual}
                  onChange={(e) => setPwdForm((p) => ({ ...p, atual: e.target.value }))}
                  required
                />
              </div>
            )}
            {currentUser.must_change_password && (
              <div className="space-y-1">
                <Label htmlFor="pwd-atual">Senha Inicial (opcional)</Label>
                <Input
                  id="pwd-atual"
                  type="password"
                  autoComplete="current-password"
                  value={pwdForm.atual}
                  onChange={(e) => setPwdForm((p) => ({ ...p, atual: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="pwd-nova">Nova Senha</Label>
              <Input
                id="pwd-nova"
                type="password"
                autoComplete="new-password"
                value={pwdForm.nova}
                onChange={(e) => setPwdForm((p) => ({ ...p, nova: e.target.value }))}
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Mín 8, maiúscula, minúscula e número.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pwd-confirm">Confirmar Nova Senha</Label>
              <Input
                id="pwd-confirm"
                type="password"
                autoComplete="new-password"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm((p) => ({ ...p, confirm: e.target.value }))}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {!currentUser.must_change_password && (
                <Button type="button" variant="outline" onClick={() => setShowPwdDialog(false)}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar Senha'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
