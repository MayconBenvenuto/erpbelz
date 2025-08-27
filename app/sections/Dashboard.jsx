'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FileText, Target, TrendingUp, RefreshCw, ArrowUpDown, X, Activity, Award, BarChart3 } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
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
  // const implantedLives = filteredProposals.filter(p => p.status === 'implantado').reduce((sum, p) => sum + Number(p.quantidade_vidas || 0), 0)

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

  // Funil simplificado de conversão
  const funnel = useMemo(() => {
    const stages = ['em análise','pendencias seguradora','boleto liberado','implantando','implantado']
    const counts = stages.map(s => ({ stage: s, count: filteredProposals.filter(p => normalize(p.status) === normalize(s)).length }))
    const first = counts[0]?.count || 0
    return counts.map(c => ({ ...c, percOrigem: first > 0 ? (c.count / first) * 100 : 0 }))
  }, [filteredProposals])

  // Ranking de analistas (somente gestor)
  const analystRanking = useMemo(() => {
    if (currentUser.tipo_usuario !== 'gestor') return []
    const analystUsers = users.filter(u => u.tipo_usuario !== 'gestor')
    const map = {}
    filteredProposals.forEach(p => {
      if (!p.atendido_por) return
      const id = p.atendido_por
      if (!map[id]) map[id] = { id, assumidas: 0, implantadas: 0, valorImplantado: 0, totalSlaMs: 0, slaCount: 0 }
      map[id].assumidas++
      if (p.status === 'implantado') {
        map[id].implantadas++
        map[id].valorImplantado += Number(p.valor || 0)
      }
      if (p.atendido_em && p.criado_em) {
        const created = new Date(p.criado_em).getTime()
        const attended = new Date(p.atendido_em).getTime()
        if (!isNaN(created) && !isNaN(attended) && attended >= created) {
          map[id].totalSlaMs += (attended - created)
          map[id].slaCount++
        }
      }
    })
    return Object.values(map).map(m => {
      const user = analystUsers.find(u => u.id === m.id)
      const slaHoras = m.slaCount ? (m.totalSlaMs / m.slaCount) / 1000 / 3600 : 0
      const conversao = m.assumidas ? (m.implantadas / m.assumidas) * 100 : 0
      return { ...m, nome: user?.nome || '—', slaHoras, conversao }
    }).sort((a,b) => b.valorImplantado - a.valorImplantado).slice(0,5)
  }, [filteredProposals, users, currentUser.tipo_usuario])

  // Heatmap Operadora x Status (gestor)
  const heatmap = useMemo(() => {
    if (currentUser.tipo_usuario !== 'gestor') return { rows: [], max: 0 }
    const ops = Array.from(new Set(filteredProposals.map(p => p.operadora))).sort((a,b) => normalize(a).localeCompare(normalize(b)))
    const statuses = STATUS_OPTIONS
    const rows = ops.map(op => {
      const cell = {}
      statuses.forEach(st => { cell[st] = 0 })
      filteredProposals.filter(p => p.operadora === op).forEach(p => { if (cell[p.status] !== undefined) cell[p.status]++ })
      return { operadora: op, ...cell }
    })
    let max = 0
    rows.forEach(r => STATUS_OPTIONS.forEach(st => { if (r[st] > max) max = r[st] }))
    return { rows, max }
  }, [filteredProposals, currentUser.tipo_usuario])

  const heatClass = (v, max) => {
    if (max === 0) return 'bg-muted'
    const ratio = v / max
    if (ratio === 0) return 'bg-muted'
    if (ratio < 0.15) return 'bg-primary/10'
    if (ratio < 0.30) return 'bg-primary/20'
    if (ratio < 0.45) return 'bg-primary/30'
    if (ratio < 0.60) return 'bg-primary/50 text-primary-foreground'
    if (ratio < 0.75) return 'bg-primary/60 text-primary-foreground'
    if (ratio < 0.90) return 'bg-primary/70 text-primary-foreground'
    return 'bg-primary text-primary-foreground'
  }

  // Consultores únicos para dropdown
  const consultores = useMemo(() => {
    return Array.from(new Set(proposals.map(p => p.consultor).filter(Boolean))).sort((a, b) => normalize(a).localeCompare(normalize(b)))
  }, [proposals])

  return (
    <div className="space-y-6">
      {currentUser.tipo_usuario === 'gestor' && (
        <SLARealTimeWatcher proposals={proposals} currentUser={currentUser} />
      )}
      <Card className="max-w-sm border shadow-sm">
        <CardHeader className="py-3 px-4 space-y-1">
          <CardTitle className="text-sm font-semibold leading-tight">Meta</CardTitle>
          <CardDescription className="text-xs leading-snug">Progresso baseado em propostas implantadas</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 text-xs">
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
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span>Progresso geral</span>
                    <span>{formatCurrency(totalAchieved)} / {formatCurrency(totalTarget)}</span>
                  </div>
                  <Progress value={Math.min(Math.max(progress, 0), 100)} className="h-2" />
                  <p className="text-[10px] text-muted-foreground">
                    {progress >= 100 ? 'Meta atingida! 🎉' : `Faltam ${formatCurrency(Math.max(0, totalTarget - totalAchieved))}`}
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
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span>Seu progresso</span>
                    <span>{formatCurrency(achieved)} / {formatCurrency(target)}</span>
                  </div>
                  <Progress value={Math.min(Math.max(progress, 0), 100)} className="h-2" />
                  <p className="text-[10px] text-muted-foreground">
                    {progress >= 100 ? 'Meta atingida! 🎉' : `Faltam ${formatCurrency(Math.max(0, target - achieved))}`}
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

      {currentUser.tipo_usuario === 'gestor' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-4 h-4" /> Funil</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {funnel.map(f => (
                <div key={f.stage} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize">{f.stage}</span>
                    <span>{f.count} ({f.percOrigem.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded">
                    <div className="h-2 bg-primary rounded" style={{ width: `${Math.min(100, f.percOrigem)}%` }} />
                  </div>
                </div>
              ))}
              {funnel.every(f => f.count === 0) && <p className="text-xs text-muted-foreground">Sem dados ainda.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><Award className="w-4 h-4" /> Ranking Analistas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {analystRanking.length === 0 && <p className="text-xs text-muted-foreground">Sem propostas assumidas.</p>}
              {analystRanking.map((a, idx) => (
                <div key={a.id} className="flex items-center justify-between text-xs p-2 border rounded-md bg-card/50">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold w-4 text-right">{idx+1}.</span>
                    <span className="font-medium">{a.nome}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">{a.implantadas}/{a.assumidas}</span>
                    <Badge variant="secondary" className="text-emerald-700 bg-emerald-100">{a.conversao.toFixed(0)}%</Badge>
                    <Badge variant="outline">{a.slaHoras.toFixed(1)}h SLA</Badge>
                    <Badge className="bg-blue-600 text-white">{formatCurrency(a.valorImplantado)}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Heatmap</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {heatmap.rows.length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
              {heatmap.rows.length > 0 && (
                <table className="min-w-full text-[10px] border-collapse">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1 text-left">Operadora</th>
                      {STATUS_OPTIONS.map(st => (
                        <th key={st} className="border px-2 py-1 capitalize whitespace-nowrap">{st.split(' ')[0]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmap.rows.map(r => (
                      <tr key={r.operadora} className="hover:bg-muted/40">
                        <td className="border px-2 py-1 capitalize font-medium sticky left-0 bg-background/80 backdrop-blur">{r.operadora}</td>
                        {STATUS_OPTIONS.map(st => (
                          <td key={st} className={`border px-1 py-1 text-center ${heatClass(r[st], heatmap.max)} transition-colors`}>{r[st] || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

  {/* Meta movida para o topo */}
    </div>
  )
}

// Componente interno para alertar gestor sobre propostas livres estourando SLA
function SLARealTimeWatcher({ proposals, currentUser }) {
  const alertedRef = useRef(new Set())
  const lastTickRef = useRef(0)
  useEffect(() => {
    if (currentUser.tipo_usuario !== 'gestor') return
    const tick = () => {
      const nowTs = Date.now()
      if (nowTs - lastTickRef.current < 5000) return // proteção dupla caso setInterval duplique
      lastTickRef.current = nowTs
      const now = Date.now()
      const thresholdMs = 8 * 3600 * 1000 // 8h
      proposals.filter(p => !p.atendido_por).forEach(p => {
        const created = new Date(p.criado_em).getTime()
        if (isNaN(created)) return
        const waited = now - created
        if (waited >= thresholdMs) {
          if (!alertedRef.current.has(p.id)) {
            alertedRef.current.add(p.id)
            const hours = (waited/3600000).toFixed(1)
            toast.error(`(Gestor) SLA estourado: proposta ${p.codigo || p.id.slice(0,8)} livre há ${hours}h`)
          }
        }
      })
    }
    const interval = setInterval(tick, 30_000)
    tick()
    return () => clearInterval(interval)
  }, [proposals, currentUser])
  return null
}
