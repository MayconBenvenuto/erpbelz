'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FileText, Target, TrendingUp, RefreshCw, ArrowUpDown, X } from 'lucide-react'
import { formatCurrency, getStatusBadgeClasses } from '@/lib/utils'
import { STATUS_OPTIONS } from '@/lib/constants'
import { useEffect, useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function DashboardSection({ currentUser, proposals, userGoals, users = [] }) {
  const [statusSortAsc, setStatusSortAsc] = useState(false)
  const [operadorasSortAsc, setOperadorasSortAsc] = useState(false)
  const [statusFilter, setStatusFilter] = useState('todos')
  const [consultorFilter, setConsultorFilter] = useState('todos')
  const [vidasFilter, setVidasFilter] = useState('todos')
  const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

  // Persistência do filtro de status por usuário
  useEffect(() => {
    try {
      const key = `crm:dashboard:statusFilter:${currentUser?.id || 'anon'}`
      const saved = localStorage.getItem(key)
      if (saved) setStatusFilter(saved)
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  useEffect(() => {
    try {
      const key = `crm:dashboard:statusFilter:${currentUser?.id || 'anon'}`
      localStorage.setItem(key, statusFilter)
    } catch (_) {}
  }, [statusFilter, currentUser?.id])

  // Persistência do filtro de consultor por usuário
  useEffect(() => {
    try {
      const key = `crm:dashboard:consultorFilter:${currentUser?.id || 'anon'}`
      const saved = localStorage.getItem(key)
      if (saved) setConsultorFilter(saved)
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  useEffect(() => {
    try {
      const key = `crm:dashboard:consultorFilter:${currentUser?.id || 'anon'}`
      localStorage.setItem(key, consultorFilter)
    } catch (_) {}
  }, [consultorFilter, currentUser?.id])

  // Persistência do filtro de vidas por usuário
  useEffect(() => {
    try {
      const key = `crm:dashboard:vidasFilter:${currentUser?.id || 'anon'}`
      const saved = localStorage.getItem(key)
      if (saved) setVidasFilter(saved)
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  useEffect(() => {
    try {
      const key = `crm:dashboard:vidasFilter:${currentUser?.id || 'anon'}`
      localStorage.setItem(key, vidasFilter)
    } catch (_) {}
  }, [vidasFilter, currentUser?.id])

  // Lista de filtros ativos (preparado para futuros filtros)
  const activeFilters = useMemo(() => {
    const items = []
    if (statusFilter !== 'todos') {
      items.push({ key: 'status', label: `status: ${statusFilter}`, onClear: () => setStatusFilter('todos') })
    }
    if (consultorFilter !== 'todos') {
      items.push({ key: 'consultor', label: `consultor: ${consultorFilter}`, onClear: () => setConsultorFilter('todos') })
    }
    if (vidasFilter !== 'todos') {
      items.push({ key: 'vidas', label: `vidas: ${vidasFilter.replaceAll('-', '–')}`, onClear: () => setVidasFilter('todos') })
    }
    return items
  }, [statusFilter, consultorFilter, vidasFilter])

  const filteredProposals = useMemo(() => {
    let list = proposals
    if (statusFilter !== 'todos') list = list.filter(p => normalize(p.status) === normalize(statusFilter))
    if (consultorFilter !== 'todos') list = list.filter(p => normalize(p.consultor) === normalize(consultorFilter))
    // Vidas filter by ranges
    const getVidas = (p) => Number(p.quantidade_vidas || 0)
    switch (vidasFilter) {
      case '0-10':
        list = list.filter(p => getVidas(p) >= 0 && getVidas(p) <= 10)
        break
      case '11-50':
        list = list.filter(p => getVidas(p) >= 11 && getVidas(p) <= 50)
        break
      case '51-100':
        list = list.filter(p => getVidas(p) >= 51 && getVidas(p) <= 100)
        break
      case '101-200':
        list = list.filter(p => getVidas(p) >= 101 && getVidas(p) <= 200)
        break
      case '200+':
        list = list.filter(p => getVidas(p) >= 200)
        break
      default:
        break
    }
    return list
  }, [proposals, statusFilter, consultorFilter, vidasFilter])

  const totalProposals = filteredProposals.length
  const implantedProposals = filteredProposals.filter(p => p.status === 'implantado').length
  const totalValue = filteredProposals.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0)
  const implantedValue = filteredProposals.filter(p => p.status === 'implantado').reduce((sum, p) => sum + parseFloat(p.valor || 0), 0)
  const totalLives = filteredProposals.reduce((sum, p) => sum + Number(p.quantidade_vidas || 0), 0)
  const implantedLives = filteredProposals.filter(p => p.status === 'implantado').reduce((sum, p) => sum + Number(p.quantidade_vidas || 0), 0)

  const statusCounts = useMemo(() =>
    STATUS_OPTIONS.map((status) => {
      const count = filteredProposals.filter(p => normalize(p.status) === normalize(status)).length
      return { status, count }
    }).sort((a, b) => statusSortAsc ? a.count - b.count : b.count - a.count)
  , [filteredProposals, statusSortAsc])

  const topOperadoras = useMemo(() => {
    const counts = Object.entries(filteredProposals.reduce((acc, p) => { acc[p.operadora] = (acc[p.operadora] || 0) + 1; return acc }, {}))
      .map(([operadora, count]) => ({ operadora, count }))
      .sort((a, b) => operadorasSortAsc ? a.count - b.count : b.count - a.count)
      .slice(0, 5)
    return counts
  }, [filteredProposals, operadorasSortAsc])

  // Consultores únicos para dropdown
  const consultores = useMemo(() => {
    return Array.from(new Set(proposals.map(p => p.consultor).filter(Boolean))).sort((a, b) => normalize(a).localeCompare(normalize(b)))
  }, [proposals])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meta</CardTitle>
          <CardDescription>Progresso baseado em propostas implantadas</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const DEFAULT_TARGET = 200000
            // users inclui gestores e analistas; consideraremos apenas analistas no agregado

            if (currentUser.tipo_usuario === 'gestor') {
              // Somar metas/alcance apenas dos analistas
              const analystIds = users.filter(u => u.tipo_usuario !== 'gestor').map(u => u.id)
              let totalTarget = 0
              let totalAchieved = 0

              analystIds.forEach(uid => {
                const goal = userGoals.find(g => g.usuario_id === uid)
                const target = Number(goal?.valor_meta ?? DEFAULT_TARGET)
                // Fallback por propostas implantadas caso goal não exista
                const achievedFallback = proposals
                  .filter(p => String(p.criado_por) === String(uid) && p.status === 'implantado')
                  .reduce((sum, p) => sum + Number(p.valor || 0), 0)
                const achieved = Number(goal?.valor_alcancado ?? achievedFallback)
                totalTarget += target
                totalAchieved += achieved
              })

              const progress = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0
              return (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso geral (analistas)</span>
                    <span>{formatCurrency(totalAchieved)} / {formatCurrency(totalTarget)}</span>
                  </div>
                  <Progress value={Math.min(Math.max(progress, 0), 100)} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {progress >= 100 ? 'Meta atingida! 🎉' : `Faltam ${formatCurrency(Math.max(0, totalTarget - totalAchieved))} para atingir a meta`}
                  </p>
                </div>
              )
            } else {
              // Meta individual do analista
              const goal = userGoals.find(g => g.usuario_id === currentUser.id)
              const target = Number(goal?.valor_meta ?? DEFAULT_TARGET)
              const achievedFallback = proposals
                .filter(p => String(p.criado_por) === String(currentUser.id) && p.status === 'implantado')
                .reduce((sum, p) => sum + Number(p.valor || 0), 0)
              const achieved = Number(goal?.valor_alcancado ?? achievedFallback)
              const progress = target > 0 ? (achieved / target) * 100 : 0
              return (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Seu progresso</span>
                    <span>{formatCurrency(achieved)} / {formatCurrency(target)}</span>
                  </div>
                  <Progress value={Math.min(Math.max(progress, 0), 100)} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {progress >= 100 ? 'Meta atingida! 🎉' : `Faltam ${formatCurrency(Math.max(0, target - achieved))} para atingir a meta`}
                  </p>
                </div>
              )
            }
          })()}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {currentUser.tipo_usuario === 'gestor' && (
              <>
                <div className="w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Filtrar status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-56">
                  <Select value={consultorFilter} onValueChange={setConsultorFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Filtrar consultor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os consultores</SelectItem>
                      {consultores.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {/* Filtro de vidas visível para analistas e gestores */}
            <div className="w-44">
              <Select value={vidasFilter} onValueChange={setVidasFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Filtrar vidas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as vidas</SelectItem>
                  <SelectItem value="0-10">0–10 vidas</SelectItem>
                  <SelectItem value="11-50">11–50 vidas</SelectItem>
                  <SelectItem value="51-100">51–100 vidas</SelectItem>
                  <SelectItem value="101-200">101–200 vidas</SelectItem>
                  <SelectItem value="200+">200+ vidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => { setStatusFilter('todos'); setConsultorFilter('todos'); setVidasFilter('todos') }}
              className="text-xs px-2 py-1 border rounded-md hover:bg-muted"
              title="Limpar filtro"
            >
              Limpar
            </button>
            {activeFilters.length > 0 && (
              <div className="flex items-center flex-wrap gap-2">
                {activeFilters.map(f => (
                  <Badge key={f.key} variant="secondary" className="text-xs gap-1">
                    <span>{f.label}</span>
                    <button
                      type="button"
                      aria-label={`Remover filtro ${f.key}`}
                      className="ml-1 opacity-80 hover:opacity-100"
                      onClick={f.onClear}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
            <span>Atualização automática a cada 30s</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalProposals}</div>
            <p className="text-xs text-muted-foreground">Total no sistema</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vidas Totais (filtradas)</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{totalLives}</div>
            <p className="text-xs text-muted-foreground">Somatório de vidas nas propostas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas Implantadas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{implantedProposals}</div>
            <p className="text-xs text-muted-foreground">{totalProposals > 0 ? Math.round((implantedProposals / totalProposals) * 100) : 0}% de conversão</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total das Propostas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Pipeline completo</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Implantado</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{formatCurrency(implantedValue)}</div>
            <p className="text-xs text-muted-foreground">{totalValue > 0 ? Math.round((implantedValue / totalValue) * 100) : 0}% do total</p>
          </CardContent>
        </Card>

            {/*COMENTADO O CARD DE ''VIDAS IMPLANTADAS*/}
            
        {/*<Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vidas Implantadas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{implantedLives}</div>
            <p className="text-xs text-muted-foreground">{totalLives > 0 ? Math.round((implantedLives / totalLives) * 100) : 0}% do total de vidas</p>
          </CardContent>
        </Card>*/}
      </div>

      {currentUser.tipo_usuario === 'gestor' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Propostas por Status</CardTitle>
                <button
                  type="button"
                  onClick={() => setStatusSortAsc(v => !v)}
                  className="inline-flex items-center text-xs px-2 py-1 border rounded-md hover:bg-muted"
                  title={statusSortAsc ? 'Ordenar por maior' : 'Ordenar por menor'}
                >
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                  {statusSortAsc ? 'Crescente' : 'Decrescente'}
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {statusCounts.map(({ status, count }) => {
                const percentage = totalProposals > 0 ? (count / totalProposals) * 100 : 0
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusBadgeClasses(status)}`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{count}</span>
                      <span className="text-xs text-muted-foreground ml-2">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Top Operadoras</CardTitle>
                <button
                  type="button"
                  onClick={() => setOperadorasSortAsc(v => !v)}
                  className="inline-flex items-center text-xs px-2 py-1 border rounded-md hover:bg-muted"
                  title={operadorasSortAsc ? 'Ordenar por maior' : 'Ordenar por menor'}
                >
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                  {operadorasSortAsc ? 'Crescente' : 'Decrescente'}
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {topOperadoras.map(({ operadora, count }) => (
                <div key={operadora} className="flex items-center justify-between">
                  <span className="capitalize">{operadora}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

  {/* Meta movida para o topo */}
    </div>
  )
}
