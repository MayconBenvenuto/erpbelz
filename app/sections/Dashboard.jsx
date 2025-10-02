'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency, getOperadoraLogoFile } from '@/lib/utils'
import {
  STATUS_OPTIONS,
  STATUS_COLORS,
  SOLICITACAO_STATUS,
  SOLICITACAO_STATUS_COLORS,
  OPERADORAS,
} from '@/lib/constants'
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  LayoutGrid,
  LineChart as LineChartIcon,
  Target,
  Users,
  ExternalLink,
} from 'lucide-react'
import Image from 'next/image'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from 'recharts'

// Dashboard focado no papel gestor/gerente
export default function DashboardSection({
  currentUser: _currentUser,
  proposals = [],
  users = [],
  userGoals: _userGoals = [],
  solicitacoes = [],
}) {
  const [active, setActive] = useState('geral')

  // Filtros com persistência
  const storageKey = `mgr-dash-filters:${_currentUser?.id || 'global'}`
  const [dateRange, setDateRange] = useState('30d') // 7d | 30d | 90d | mes | ano | custom
  const [customFrom, setCustomFrom] = useState('') // YYYY-MM-DD
  const [customTo, setCustomTo] = useState('')
  const [statusPropostas, setStatusPropostas] = useState([]) // strings de STATUS_OPTIONS
  const [statusSolicitacoes, setStatusSolicitacoes] = useState([]) // strings de SOLICITACAO_STATUS
  const [analistaId, setAnalistaId] = useState('') // user id
  const [operadorasSel, setOperadorasSel] = useState([]) // strings
  const [consultorSel, setConsultorSel] = useState('') // nome/email consultor

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (saved) {
        setDateRange(saved.dateRange || '30d')
        setCustomFrom(saved.customFrom || '')
        setCustomTo(saved.customTo || '')
        setStatusPropostas(Array.isArray(saved.statusPropostas) ? saved.statusPropostas : [])
        setStatusSolicitacoes(
          Array.isArray(saved.statusSolicitacoes) ? saved.statusSolicitacoes : []
        )
        setAnalistaId(saved.analistaId || '')
        setOperadorasSel(Array.isArray(saved.operadorasSel) ? saved.operadorasSel : [])
        setConsultorSel(saved.consultorSel || '')
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const state = {
      dateRange,
      customFrom,
      customTo,
      statusPropostas,
      statusSolicitacoes,
      analistaId,
      operadorasSel,
      consultorSel,
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch {}
  }, [
    dateRange,
    customFrom,
    customTo,
    statusPropostas,
    statusSolicitacoes,
    analistaId,
    operadorasSel,
    consultorSel,
    storageKey,
  ])

  // Helpers
  const safeDate = (d) => {
    try {
      return new Date(d).getTime()
    } catch {
      return 0
    }
  }

  // Deriva período
  const periodBounds = useMemo(() => {
    const now = new Date()
    let from, to
    if (dateRange === 'custom') {
      from = customFrom ? new Date(customFrom) : null
      to = customTo ? new Date(customTo) : null
    } else if (dateRange === '7d') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      to = now
    } else if (dateRange === '30d') {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      to = now
    } else if (dateRange === '90d') {
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      to = now
    } else if (dateRange === 'mes') {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      to = now
    } else if (dateRange === 'ano') {
      from = new Date(now.getFullYear(), 0, 1)
      to = now
    } else {
      from = null
      to = null
    }
    return { from: from ? from.getTime() : null, to: to ? to.getTime() : null }
  }, [dateRange, customFrom, customTo])

  // Filtragem base
  const filteredProposals = useMemo(() => {
    if (!Array.isArray(proposals)) return []
    const within = (t) => {
      const ts = safeDate(t)
      if (!periodBounds.from || !periodBounds.to) return true
      return ts >= periodBounds.from && ts <= periodBounds.to
    }
    const hasStatus = (s) =>
      statusPropostas.length === 0 || statusPropostas.includes(String(s || '').toLowerCase())
    const hasOperadora = (op) =>
      operadorasSel.length === 0 || operadorasSel.includes(String(op || '').toLowerCase())
    const hasAnalista = (id) => !analistaId || String(id || '') === String(analistaId)
    const hasConsultor = (c, e) =>
      !consultorSel ||
      [String(c || ''), String(e || '')]
        .map((x) => x.toLowerCase())
        .includes(String(consultorSel).toLowerCase())
    return proposals.filter(
      (p) =>
        within(p.criado_em) &&
        hasStatus(p.status) &&
        hasOperadora(p.operadora) &&
        hasAnalista(p.atendido_por) &&
        hasConsultor(p.consultor, p.consultor_email)
    )
  }, [proposals, periodBounds, statusPropostas, operadorasSel, analistaId, consultorSel])

  const filteredSolicitacoes = useMemo(() => {
    if (!Array.isArray(solicitacoes)) return []
    const within = (t) => {
      const ts = safeDate(t)
      if (!periodBounds.from || !periodBounds.to) return true
      return ts >= periodBounds.from && ts <= periodBounds.to
    }
    const hasStatus = (s) =>
      statusSolicitacoes.length === 0 || statusSolicitacoes.includes(String(s || '').toLowerCase())
    const hasOperadora = (op) =>
      operadorasSel.length === 0 || operadorasSel.includes(String(op || '').toLowerCase())
    const hasAnalista = (id) => !analistaId || String(id || '') === String(analistaId)
    return solicitacoes.filter(
      (s) =>
        within(s.criado_em) &&
        hasStatus(s.status) &&
        hasOperadora(s.operadora) &&
        hasAnalista(s.atendido_por)
    )
  }, [solicitacoes, periodBounds, statusSolicitacoes, operadorasSel, analistaId])

  // Propostas - métricas macro (usando filtradas)
  const mPropostas = useMemo(() => {
    const now = Date.now()
    const total = filteredProposals.length
    const implantadas = filteredProposals.filter((p) => p.status === 'implantado').length
    const valorTotal = filteredProposals.reduce((s, p) => s + Number(p.valor || 0), 0)
    const valorImplantado = filteredProposals
      .filter((p) => p.status === 'implantado')
      .reduce((s, p) => s + Number(p.valor || 0), 0)
    const conversao = total > 0 ? Math.round((implantadas / total) * 100) : 0

    // Contagem por status
    const statusCounts = STATUS_OPTIONS.map((st) => {
      const count = filteredProposals.filter(
        (p) => String(p.status || '').toLowerCase() === String(st).toLowerCase()
      ).length
      return { status: st, count }
    })

    // Top operadoras
    const byOperadora = new Map()
    for (const p of filteredProposals) {
      const op = (p.operadora || '').toString().toLowerCase()
      if (!op) continue
      byOperadora.set(op, (byOperadora.get(op) || 0) + 1)
    }
    const topOperadoras = Array.from(byOperadora.entries())
      .map(([operadora, count]) => ({ operadora, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Evolução últimos 7 dias (criação x assunção)
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(now - (6 - i) * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      return { label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), key }
    })
    const series = days.map(({ label, key }) => {
      const criadas = filteredProposals.filter(
        (p) => p.criado_em && new Date(p.criado_em).toISOString().slice(0, 10) === key
      ).length
      const assumidas = filteredProposals.filter(
        (p) => p.atendido_em && new Date(p.atendido_em).toISOString().slice(0, 10) === key
      ).length
      return { dia: label, criadas, assumidas }
    })

    // Buckets de valor
    const buckets = [
      { label: '0-2k', min: 0, max: 2000 },
      { label: '2k-5k', min: 2000, max: 5000 },
      { label: '5k-10k', min: 5000, max: 10000 },
      { label: '10k+', min: 10000, max: Infinity },
    ].map((b) => ({ ...b, count: 0 }))
    for (const p of filteredProposals) {
      const v = Number(p.valor || 0)
      const bucket = buckets.find((b) => v >= b.min && v < b.max)
      if (bucket) bucket.count++
    }

    // Ranking analistas por pipeline
    const emAndamento = filteredProposals.filter((p) => p.status !== 'implantado')
    const porAnalista = new Map()
    for (const p of emAndamento) {
      if (!p.atendido_por) continue
      porAnalista.set(String(p.atendido_por), (porAnalista.get(String(p.atendido_por)) || 0) + 1)
    }
    const rankingAnalistas = Array.isArray(users)
      ? users
          .map((u) => ({ id: u.id, nome: u.nome, count: porAnalista.get(String(u.id)) || 0 }))
          .filter((x) => x.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      : []

    return {
      total,
      implantadas,
      valorTotal,
      valorImplantado,
      conversao,
      statusCounts,
      topOperadoras,
      series,
      buckets,
      rankingAnalistas,
    }
  }, [filteredProposals, users])

  // Movimentação (solicitações)
  const mMov = useMemo(() => {
    const now = Date.now()
    const total = filteredSolicitacoes.length
    const porStatus = SOLICITACAO_STATUS.map((st) => ({
      status: st,
      count: filteredSolicitacoes.filter((s) => s.status === st).length,
    }))
    const abertas = filteredSolicitacoes.filter(
      (s) => !['concluída', 'cancelada'].includes(s.status)
    )
    const vencidas = abertas.filter((s) => s.sla_previsto && safeDate(s.sla_previsto) < now).length
    const idadeMediaDias = (() => {
      if (abertas.length === 0) return 0
      const medias = abertas.map((s) => (now - safeDate(s.criado_em)) / (24 * 60 * 60 * 1000))
      return Math.round(medias.reduce((a, b) => a + b, 0) / abertas.length)
    })()
    return { total, porStatus, vencidas, idadeMediaDias }
  }, [filteredSolicitacoes])

  // Equipe
  const mEquipe = useMemo(() => {
    const now = Date.now()
    const isOnline = (u) =>
      Boolean(
        u?.isOnline || (u?.ultimo_refresh && now - safeDate(u.ultimo_refresh) < 5 * 60 * 1000)
      )
    const online = users.filter((u) => isOnline(u))
    const total = users.length
    const workload = users.map((u) => ({
      id: u.id,
      nome: u.nome,
      online: isOnline(u),
      emAndamento: filteredProposals.filter(
        (p) =>
          p.atendido_por && String(p.atendido_por) === String(u.id) && p.status !== 'implantado'
      ).length,
      implantadas30d: filteredProposals.filter(
        (p) =>
          p.status === 'implantado' &&
          String(p.atendido_por) === String(u.id) &&
          now - safeDate(p.updated_at || p.atendido_em || p.criado_em) <= 30 * 24 * 60 * 60 * 1000
      ).length,
    }))
    const topWorkload = workload
      .filter((w) => w.emAndamento > 0)
      .sort((a, b) => b.emAndamento - a.emAndamento)
      .slice(0, 5)
    const topImplantadas = workload
      .filter((w) => w.implantadas30d > 0)
      .sort((a, b) => b.implantadas30d - a.implantadas30d)
      .slice(0, 5)
    return { total, online: online.length, topWorkload, topImplantadas }
  }, [users, filteredProposals])

  // Watcher: Propostas sem responsável com SLA estourado (>24h) respeitando filtros
  const propostasAbertasCriticas = useMemo(() => {
    const now = Date.now()
    return filteredProposals.filter(
      (p) => !p.atendido_por && p.criado_em && now - safeDate(p.criado_em) > 24 * 60 * 60 * 1000
    )
  }, [filteredProposals])

  // Configs de cores para ChartContainer
  const chartConfig = useMemo(
    () => ({
      criadas: { label: 'Criadas', color: '#3B82F6' },
      assumidas: { label: 'Assumidas', color: '#8B5CF6' },
      count: { label: 'Quantidade', color: '#3B82F6' },
      bucket: { label: 'Bucket', color: '#10B981' },
      operadora: { label: 'Operadora', color: '#06B6D4' },
      status: { label: 'Status', color: '#64748B' },
    }),
    []
  )

  const operadoraLegendConfig = useMemo(() => {
    const cfg = {}
    mPropostas.topOperadoras.forEach(({ operadora }) => {
      const logo = getOperadoraLogoFile(operadora)
      cfg[operadora] = {
        label: operadora,
        ...(logo
          ? {
              icon: () => (
                <Image
                  src={`/seguradoras/${logo}`}
                  alt={operadora}
                  width={14}
                  height={14}
                  className="h-3 w-auto"
                />
              ),
            }
          : {}),
      }
    })
    return cfg
  }, [mPropostas.topOperadoras])

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Dashboard do Gestor</h2>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{users.length} usuários</span>
        </div>
      </div>

      {/* Atalhos de trabalho (somente gestor) */}
      {_currentUser?.tipo_usuario === 'gestor' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Atalhos de Trabalho</CardTitle>
            <CardDescription className="text-xs">
              Links úteis usados no dia a dia (abre em nova guia)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {/* Planilhas */}
              <a
                href="https://docs.google.com/spreadsheets/d/1NK7tGQCioDRoTFlI7bCSlLqXLKdUyfoe-_uCNHO7bi0/edit?gid=1533137706#gid=1533137706"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                title="Planilha de Boletos/Movimentação"
              >
                <ExternalLink className="w-4 h-4" /> Planilha: Boletos/Movimentação
              </a>
              <a
                href="https://docs.google.com/spreadsheets/d/1eRgoxc6oqtdVNMWwYJiWHhe_SmEEW9LaL0-zSTGj8kc/edit?gid=11585494#gid=11585494"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                title="Planilha de Implantação"
              >
                <ExternalLink className="w-4 h-4" /> Planilha: Implantação
              </a>

              {/* Sites Operadoras */}
              <a
                href="https://wwwn.bradescoseguros.com.br/pnegocios2/wps/portal/portaldenegociosnovo/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8zifdx9PA0sLYz8DJzdjAwCHcOCTdx9jQxNfE30wwkpiAJKG-AAjgZA_VGElBTkRhikOyoqAgBzNoDA/dz/d5/L2dBISEvZ0FBIS9nQSEh/"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                title="Portal Bradesco Seguros"
              >
                <ExternalLink className="w-4 h-4" /> Bradesco (Portal de Negócios)
              </a>
              <a
                href="https://corretor.sulamericaseguros.com.br/?accessError=2#/"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                title="Portal Corretor SulAmérica"
              >
                <ExternalLink className="w-4 h-4" /> SulAmérica (Corretor)
              </a>
              <a
                href="https://institucional.amil.com.br/"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                title="Portal Amil"
              >
                <ExternalLink className="w-4 h-4" /> Amil
              </a>
              <a
                href="https://remote.unimedrecife.com.br:444/connecta/Default.aspx?ReturnUrl=%2fconnecta%2fContent%2fContrato%2fCoParticipacao.aspx"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                title="Unimed Recife Connecta"
              >
                <ExternalLink className="w-4 h-4" /> Unimed Recife (Connecta)
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barra de Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Período */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Período</span>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="90d">Últimos 90 dias</SelectItem>
                    <SelectItem value="mes">Este mês</SelectItem>
                    <SelectItem value="ano">Ano atual</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Datas customizadas */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">De</span>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  disabled={dateRange !== 'custom'}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Até</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  disabled={dateRange !== 'custom'}
                />
              </div>
              {/* Analista */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Analista</span>
                <Select
                  value={analistaId || '__all__'}
                  onValueChange={(v) => setAnalistaId(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Operadora (multi) */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Operadora</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="justify-between">
                      {operadorasSel.length > 0
                        ? `${operadorasSel.length} selecionada(s)`
                        : 'Todas'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Operadoras</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {OPERADORAS.map((op) => {
                      const val = String(op).toLowerCase()
                      const checked = operadorasSel.includes(val)
                      return (
                        <DropdownMenuCheckboxItem
                          key={val}
                          checked={checked}
                          onCheckedChange={(v) => {
                            setOperadorasSel((prev) =>
                              v
                                ? Array.from(new Set([...prev, val]))
                                : prev.filter((x) => x !== val)
                            )
                          }}
                        >
                          {op}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Consultor */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Consultor</span>
                <Select
                  value={consultorSel || '__all__'}
                  onValueChange={(v) => setConsultorSel(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {Array.from(
                      new Set(
                        proposals
                          .map((p) => (p.consultor || p.consultor_email || '').toString())
                          .filter(Boolean)
                      )
                    ).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Status Propostas (multi) */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Status (Propostas)</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="justify-between">
                      {statusPropostas.length > 0
                        ? `${statusPropostas.length} selecionado(s)`
                        : 'Todos'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Status de Propostas</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {STATUS_OPTIONS.map((st) => {
                      const val = String(st).toLowerCase()
                      const checked = statusPropostas.includes(val)
                      return (
                        <DropdownMenuCheckboxItem
                          key={val}
                          checked={checked}
                          onCheckedChange={(v) => {
                            setStatusPropostas((prev) =>
                              v
                                ? Array.from(new Set([...prev, val]))
                                : prev.filter((x) => x !== val)
                            )
                          }}
                        >
                          {st}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Status Solicitações (multi) */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Status (Solicitações)</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="justify-between">
                      {statusSolicitacoes.length > 0
                        ? `${statusSolicitacoes.length} selecionado(s)`
                        : 'Todos'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Status de Solicitações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {SOLICITACAO_STATUS.map((st) => {
                      const val = String(st).toLowerCase()
                      const checked = statusSolicitacoes.includes(val)
                      return (
                        <DropdownMenuCheckboxItem
                          key={val}
                          checked={checked}
                          onCheckedChange={(v) => {
                            setStatusSolicitacoes((prev) =>
                              v
                                ? Array.from(new Set([...prev, val]))
                                : prev.filter((x) => x !== val)
                            )
                          }}
                        >
                          {st}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-end gap-2 lg:col-span-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDateRange('30d')
                    setCustomFrom('')
                    setCustomTo('')
                    setStatusPropostas([])
                    setStatusSolicitacoes([])
                    setAnalistaId('')
                    setOperadorasSel([])
                    setConsultorSel('')
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
            </div>

            {/* Chips de filtros ativos */}
            <div className="flex flex-wrap gap-2">
              {analistaId && (
                <Badge variant="secondary" className="flex items-center gap-2">
                  Analista:{' '}
                  {users.find((u) => String(u.id) === String(analistaId))?.nome || analistaId}
                  <button className="ml-1" onClick={() => setAnalistaId('')}>
                    ×
                  </button>
                </Badge>
              )}
              {consultorSel && (
                <Badge variant="secondary" className="flex items-center gap-2">
                  Consultor: {consultorSel}
                  <button className="ml-1" onClick={() => setConsultorSel('')}>
                    ×
                  </button>
                </Badge>
              )}
              {operadorasSel.map((op) => (
                <Badge key={op} variant="secondary" className="flex items-center gap-2">
                  {op}
                  <button
                    className="ml-1"
                    onClick={() => setOperadorasSel((prev) => prev.filter((x) => x !== op))}
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {statusPropostas.map((st) => (
                <Badge key={`sp-${st}`} variant="secondary" className="flex items-center gap-2">
                  Proposta: {st}
                  <button
                    className="ml-1"
                    onClick={() => setStatusPropostas((prev) => prev.filter((x) => x !== st))}
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {statusSolicitacoes.map((st) => (
                <Badge key={`ss-${st}`} variant="secondary" className="flex items-center gap-2">
                  Solicitação: {st}
                  <button
                    className="ml-1"
                    onClick={() => setStatusSolicitacoes((prev) => prev.filter((x) => x !== st))}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {propostasAbertasCriticas.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">
              Atenção: Propostas sem responsável há mais de 24 horas
            </CardTitle>
            <CardDescription>
              Existem {propostasAbertasCriticas.length} propostas aguardando triagem.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {propostasAbertasCriticas.slice(0, 12).map((p) => (
                <Badge key={p.id} variant="destructive" className="text-xs">
                  {p.codigo || String(p.id).slice(0, 8)}
                </Badge>
              ))}
              {propostasAbertasCriticas.length > 12 && (
                <span className="text-xs text-muted-foreground">
                  +{propostasAbertasCriticas.length - 12} mais…
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="geral">
            <LayoutGrid className="w-4 h-4 mr-1" /> Geral
          </TabsTrigger>
          <TabsTrigger value="propostas">
            <FileText className="w-4 h-4 mr-1" /> Propostas
          </TabsTrigger>
          <TabsTrigger value="movimentacao">
            <Activity className="w-4 h-4 mr-1" /> Movimentação
          </TabsTrigger>
          <TabsTrigger value="equipe">
            <Users className="w-4 h-4 mr-1" /> Equipe
          </TabsTrigger>
        </TabsList>

        {/* GERAL */}
        <TabsContent value="geral" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Propostas</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{mPropostas.total}</div>
                <p className="text-xs text-muted-foreground">Total cadastradas</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Implantadas</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{mPropostas.implantadas}</div>
                <p className="text-xs text-muted-foreground">
                  {mPropostas.conversao}% de conversão
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(mPropostas.valorTotal)}
                </div>
                <p className="text-xs text-muted-foreground">Valor total</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Implantado</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(mPropostas.valorImplantado)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mPropostas.valorTotal > 0
                    ? Math.round((mPropostas.valorImplantado / mPropostas.valorTotal) * 100)
                    : 0}
                  % do total
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Evolução (7 dias)</CardTitle>
                <CardDescription>Propostas criadas e assumidas por dia</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-72">
                  <LineChart data={mPropostas.series} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dia" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="criadas"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="assumidas"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <ReferenceLine y={0} stroke="#e2e8f0" />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Operadoras</CardTitle>
                <CardDescription>Distribuição das 5 mais frequentes</CardDescription>
              </CardHeader>
              <CardContent>
                {mPropostas.topOperadoras.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
                ) : (
                  <ChartContainer config={operadoraLegendConfig} className="h-72 aspect-auto">
                    <PieChart>
                      <Pie
                        data={mPropostas.topOperadoras}
                        dataKey="count"
                        nameKey="operadora"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                      >
                        {mPropostas.topOperadoras.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'][idx % 5]}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent nameKey="operadora" />} />
                      <Legend
                        content={
                          <ChartLegendContent
                            nameKey="operadora"
                            className="flex flex-wrap gap-3 justify-center"
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status das Propostas</CardTitle>
                <CardDescription>Quantidade por status</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-72">
                  <BarChart data={mPropostas.statusCounts} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="status"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => String(v).slice(0, 12)}
                    />
                    <YAxis allowDecimals={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {mPropostas.statusCounts.map((s, idx) => {
                        const c = STATUS_COLORS[s.status] || { bg: '#e5e7eb' }
                        return <Cell key={idx} fill={c.bg} />
                      })}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Valor</CardTitle>
                <CardDescription>Contagem por faixa de valor</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-72">
                  <BarChart data={mPropostas.buckets} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PROPOSTAS */}
        <TabsContent value="propostas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {filteredProposals.filter((p) => p.status !== 'implantado').length}
                </div>
                <p className="text-xs text-muted-foreground">Exclui implantadas</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sem Responsável</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {filteredProposals.filter((p) => !p.atendido_por).length}
                </div>
                <p className="text-xs text-muted-foreground">Aguardando triagem</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <LineChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {(() => {
                  const total = filteredProposals.length || 1
                  const valorTotal = filteredProposals.reduce((s, p) => s + Number(p.valor || 0), 0)
                  const ticket = valorTotal / total
                  return (
                    <>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(ticket)}
                      </div>
                      <p className="text-xs text-muted-foreground">Média por proposta</p>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversão</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{mPropostas.implantadas} implantadas</span>
                    <span>{mPropostas.conversao}%</span>
                  </div>
                  <Progress value={mPropostas.conversao} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Analistas (pipeline)</CardTitle>
                <CardDescription>Top 5 com mais propostas em andamento</CardDescription>
              </CardHeader>
              <CardContent>
                {mPropostas.rankingAnalistas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem propostas atribuídas.</p>
                ) : (
                  <ul className="space-y-2">
                    {mPropostas.rankingAnalistas.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between p-2 rounded-md border"
                      >
                        <span className="text-sm">{r.nome}</span>
                        <Badge variant="secondary">{r.count}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Status das Propostas</CardTitle>
                <CardDescription>Visão detalhada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {mPropostas.statusCounts.map((s) => {
                    const c = STATUS_COLORS[s.status] || {
                      bg: '#f6f6f6',
                      text: '#333',
                      border: '#e2e2e2',
                    }
                    return (
                      <div
                        key={s.status}
                        className="p-3 rounded-md border text-xs"
                        style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="capitalize">{s.status}</span>
                          <strong>{s.count}</strong>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MOVIMENTAÇÃO */}
        <TabsContent value="movimentacao" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Solicitações</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{mMov.total}</div>
                <p className="text-xs text-muted-foreground">Total no período</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SLA Vencido</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{mMov.vencidas}</div>
                <p className="text-xs text-muted-foreground">Abertas e vencidas</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Idade Média</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{mMov.idadeMediaDias}d</div>
                <p className="text-xs text-muted-foreground">Apenas abertas</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  {filteredSolicitacoes.filter((s) => s.status === 'concluída').length}
                </div>
                <p className="text-xs text-muted-foreground">No período</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status das Solicitações</CardTitle>
                <CardDescription>Distribuição por status</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-72">
                  <BarChart data={mMov.porStatus} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {mMov.porStatus.map((s, idx) => {
                        const c = SOLICITACAO_STATUS_COLORS[s.status] || { bg: '#e5e7eb' }
                        return <Cell key={idx} fill={c.bg} />
                      })}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo Rápido</CardTitle>
                <CardDescription>Visão geral das prioridades</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {mMov.porStatus.map((s) => (
                    <li
                      key={s.status}
                      className="flex items-center justify-between p-2 rounded-md border"
                    >
                      <span className="capitalize">{s.status}</span>
                      <Badge variant="secondary">{s.count}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* EQUIPE */}
        <TabsContent value="equipe" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{mEquipe.total}</div>
                <p className="text-xs text-muted-foreground">Cadastrados</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{mEquipe.online}</div>
                <p className="text-xs text-muted-foreground">No momento</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Maior Workload</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {mEquipe.topWorkload[0]?.nome || '—'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mEquipe.topWorkload[0]?.emAndamento || 0} propostas
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Implantações (30d)</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  {mEquipe.topImplantadas.reduce((a, b) => a + b.implantadas30d, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Top 5 analistas</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Workload</CardTitle>
                <CardDescription>Analistas com mais propostas em andamento</CardDescription>
              </CardHeader>
              <CardContent>
                {mEquipe.topWorkload.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <ul className="space-y-2">
                    {mEquipe.topWorkload.map((w) => (
                      <li
                        key={w.id}
                        className="flex items-center justify-between p-2 rounded-md border"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${w.online ? 'bg-emerald-500' : 'bg-zinc-400'}`}
                          />
                          <span className="text-sm">{w.nome}</span>
                        </div>
                        <Badge variant="secondary">{w.emAndamento}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Implantações (30d)</CardTitle>
                <CardDescription>Analistas que mais implantaram no período</CardDescription>
              </CardHeader>
              <CardContent>
                {mEquipe.topImplantadas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <ul className="space-y-2">
                    {mEquipe.topImplantadas.map((w) => (
                      <li
                        key={w.id}
                        className="flex items-center justify-between p-2 rounded-md border"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${w.online ? 'bg-emerald-500' : 'bg-zinc-400'}`}
                          />
                          <span className="text-sm">{w.nome}</span>
                        </div>
                        <Badge variant="secondary">{w.implantadas30d}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
