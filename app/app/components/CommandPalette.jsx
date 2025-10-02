'use client'

import React from 'react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { hasPermission } from '@/lib/rbac'
import { FileText, BarChart3, Users, TrendingUp, Repeat, LogOut, PlusCircle } from 'lucide-react'

/**
 * Componentização do Command Palette para reduzir conflitos de merge no arquivo principal page.js.
 * Mantém mesma lógica anterior sem alterar comportamento.
 */
export function CommandPalette({
  open,
  onOpenChange,
  currentUser,
  setActiveTab,
  scheduleLoadData,
  handleLogout,
}) {
  if (!currentUser) return null
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      description="Digite para filtrar ações ou navegue com setas."
    >
      <CommandInput
        placeholder="Buscar ações, abas, PRP..."
        autoFocus
        onValueChange={(val) => {
          const v = String(val || '')
            .trim()
            .toUpperCase()
          if (/^PRP\d{3,}$/.test(v)) {
            setActiveTab('propostas')
            onOpenChange(false)
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('proposals:focus-code', { detail: { code: v } }))
            }, 50)
          }
        }}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          <CommandItem
            onSelect={() => {
              setActiveTab('dashboard')
              onOpenChange(false)
            }}
            value="dashboard"
          >
            <BarChart3 className="mr-2" /> Dashboard
          </CommandItem>
          {hasPermission(currentUser, 'viewPropostas') &&
            currentUser.tipo_usuario !== 'analista_cliente' && (
              <CommandItem
                onSelect={() => {
                  setActiveTab('propostas')
                  onOpenChange(false)
                }}
                value="propostas"
              >
                <FileText className="mr-2" /> Propostas
              </CommandItem>
            )}
          {hasPermission(currentUser, 'viewMovimentacao') &&
            currentUser.tipo_usuario !== 'analista_cliente' && (
              <CommandItem
                onSelect={() => {
                  setActiveTab('movimentacao')
                  onOpenChange(false)
                }}
                value="movimentacao"
              >
                <Repeat className="mr-2" /> Movimentação
              </CommandItem>
            )}
          {hasPermission(currentUser, 'manageUsers') && (
            <CommandItem
              onSelect={() => {
                setActiveTab('usuarios')
                onOpenChange(false)
              }}
              value="usuarios"
            >
              <Users className="mr-2" /> Usuários
            </CommandItem>
          )}
          {hasPermission(currentUser, 'viewRelatorios') && (
            <CommandItem
              onSelect={() => {
                setActiveTab('relatorios')
                onOpenChange(false)
              }}
              value="relatorios"
            >
              <TrendingUp className="mr-2" /> Relatórios
            </CommandItem>
          )}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ações Rápidas">
          <CommandItem
            onSelect={() => {
              scheduleLoadData?.(true)
              onOpenChange(false)
            }}
            value="recarregar"
          >
            <Repeat className="mr-2" /> Recarregar Dados
          </CommandItem>
          {hasPermission(currentUser, 'createPropostas') &&
            currentUser.tipo_usuario !== 'analista_movimentacao' &&
            currentUser.tipo_usuario !== 'analista_cliente' && (
              <CommandItem
                onSelect={() => {
                  setActiveTab('propostas')
                  onOpenChange(false)
                  setTimeout(() => {
                    document.querySelector('[data-new-proposal-btn]')?.click()
                  }, 50)
                }}
                value="nova-proposta"
              >
                <PlusCircle className="mr-2" /> Nova Proposta
              </CommandItem>
            )}
          {hasPermission(currentUser, 'manageUsers') && (
            <CommandItem
              onSelect={() => {
                setActiveTab('usuarios')
                onOpenChange(false)
                setTimeout(() => {
                  document.querySelector('[data-new-user-btn]')?.click()
                }, 50)
              }}
              value="novo-usuario"
            >
              <PlusCircle className="mr-2" /> Novo Usuário
            </CommandItem>
          )}
          <CommandItem
            onSelect={() => {
              handleLogout?.()
              onOpenChange(false)
            }}
            value="logout"
          >
            <LogOut className="mr-2" /> Sair
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

export default CommandPalette
