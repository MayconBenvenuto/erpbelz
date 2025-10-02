/**
 * Componente de filtros para Propostas
 * Extraído de Proposals.jsx para melhor organização
 */
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown, X } from 'lucide-react'

/**
 * Componente de filtros de propostas
 */
export function ProposalFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  vidasSortAsc,
  onVidasSortToggle,
  statusOptions,
  operadoras,
  users,
  consultores,
  currentUserType,
  activeFilters = [],
  onClearFilter,
}) {
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="space-y-4">
      {/* Filtros ativos */}
      {activeFilters.length > 0 && (
        <div className="text-xs flex items-center flex-wrap gap-2">
          {activeFilters.map((f) => (
            <Badge key={f.key} variant="secondary" className="gap-1">
              <span>{f.label}</span>
              <button
                type="button"
                aria-label={`Remover filtro ${f.key}`}
                className="ml-1 opacity-80 hover:opacity-100"
                onClick={() => onClearFilter(f.key)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Grid de filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Busca */}
        <div className="space-y-2 lg:col-span-2">
          <Label>Busca</Label>
          <Input
            placeholder="CNPJ, consultor ou código"
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Operadora */}
        <div className="space-y-2">
          <Label>Operadora</Label>
          <Select value={filters.operadora} onValueChange={(v) => updateFilter('operadora', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {operadoras.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Analista (apenas gestor) */}
        {currentUserType === 'gestor' && (
          <div className="space-y-2">
            <Label>Analista</Label>
            <Select value={filters.analista} onValueChange={(v) => updateFilter('analista', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Consultor (apenas gestor) */}
        {currentUserType === 'gestor' && (
          <div className="space-y-2">
            <Label>Consultor</Label>
            <Select value={filters.consultor} onValueChange={(v) => updateFilter('consultor', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {consultores.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Ações */}
        <div className="space-y-2 flex flex-col justify-end">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onVidasSortToggle}
              title={vidasSortAsc ? 'Ordenar vidas decrescente' : 'Ordenar vidas crescente'}
            >
              <ArrowUpDown className="w-4 h-4 mr-1" />
              {vidasSortAsc ? 'Vidas ↑' : 'Vidas ↓'}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={onClearFilters}>
              Limpar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
