'use client'

import { useEffect, useMemo, useState, useRef, useDeferredValue, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NovaPropostaDialog } from '@/components/propostas/NovaPropostaDialog'
import { PlusCircle, X, ArrowUpDown, Clock } from 'lucide-react'
// Virtualização: carregamento dinâmico para evitar erro de build caso a lib mude formato de export
// e para não quebrar em ambientes onde "react-window" não esteja disponível (fallback graceful)
// Virtualização simples baseada em altura fixa de item (itemSize)
function VirtualList({ itemCount, itemSize, height, width, children, className, overscan = 4 }) {
  const containerRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const pending = useRef(false)
  const latest = useRef(0)

  const onScroll = (e) => {
    latest.current = e.currentTarget.scrollTop
    if (pending.current) return
    pending.current = true
    requestAnimationFrame(() => {
      setScrollTop(latest.current)
      pending.current = false
    })
  }

  const totalHeight = itemCount * itemSize
  const startIndex = Math.max(0, Math.floor(scrollTop / itemSize))
  const visibleCount = Math.ceil(height / itemSize) + overscan
  const endIndex = Math.min(itemCount, startIndex + visibleCount)

  const items = []
  for (let i = startIndex; i < endIndex; i++) {
    const style = {
      position: 'absolute',
      top: i * itemSize,
      left: 0,
      width: '100%',
      height: itemSize,
    }
    items.push(children({ index: i, style }))
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{ position: 'relative', overflowY: 'auto', height, width }}
      className={className}
      role="list"
      aria-label="Lista virtualizada"
    >
      <div style={{ height: totalHeight, position: 'relative', width: '100%' }}>{items}</div>
    </div>
  )
}

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { formatCurrency, formatCNPJ } from '@/lib/utils'
import { STATUS_COLORS } from '@/lib/constants'
const ProposalsTimeline = dynamic(
  () => import('@/components/timeline/ProposalsTimelineComponent'),
  { ssr: false, loading: () => <div className="text-xs p-2">Carregando timeline...</div> }
)
import OperadoraBadge from '@/components/ui/operadora-badge'
import { queryClient } from '@/lib/query-client'

export default function ProposalsSection(props) {
  return <ProposalsInner {...props} />
}

function ProposalsInner({
  currentUser,
  proposals,
  operadoras,
  statusOptions,
  onCreateProposal,
  onUpdateProposalStatus,
  onPatchProposal,
  // isLoading,
  users = [],
  // userGoals = [],
}) {
  // Máscaras e formatação ----------------------------------
  // Funções de máscara e formatação movidas para componente dedicado de criação
  // SLA & resumo com polling + alertas
  const [slaSummary, setSlaSummary] = useState(null)
  const SLA_THRESHOLD_HOURS = 8
  const AGE_ALERT_HOURS = 24
  const AGE_STRONG_ALERT_HOURS = 48
  const slaAlertedRef = useRef(new Set())
  useEffect(() => {
    let stopped = false
    const intervalMs = 30_000
    const load = async () => {
      if (stopped) return
      try {
        const r = await fetch('/api/proposals/summary', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (r.ok) {
          setSlaSummary(await r.json())
        }
      } catch (_) {}
      if (!stopped) setTimeout(load, intervalMs)
    }
    load()
    return () => {
      stopped = true
    }
  }, [])
  // Dialog criação
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  // Filtros
  const defaultFilters = {
    q: '',
    status: 'todos',
    operadora: 'todas',
    analista: 'todos',
    consultor: 'todos',
  }
  const [filters, setFilters] = useState(defaultFilters)
  const [vidasSortAsc, setVidasSortAsc] = useState(true)
  // Edição (gestor)
  const [editDialogFor, setEditDialogFor] = useState(null)
  const [editForm, setEditForm] = useState({
    operadora: '',
    quantidade_vidas: '',
    valor: '',
    previsao_implantacao: '',
    consultor: '',
    consultor_email: '',
    criado_por: '',
  })
  // Futuro: incluir cliente_nome/cliente_email em edição se necessário
  const [updatingStatus, setUpdatingStatus] = useState({})
  const [auditOpenFor, setAuditOpenFor] = useState(null)
  // Detalhes
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState(null)

  // (formatMoneyBR redefinido acima com limites)

  // normalize com cache simples para performance em filtros grandes
  const normalizeCacheRef = useRef(new Map())
  const normalize = (s) => {
    const key = s || ''
    const cache = normalizeCacheRef.current
    if (cache.has(key)) return cache.get(key)
    const v = String(key)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
    if (cache.size > 5000) cache.clear()
    cache.set(key, v)
    return v
  }

  // Persistência de filtros por usuário
  useEffect(() => {
    try {
      const erpKey = `erp:proposals:filters:${currentUser?.id || 'anon'}`
      const crmKey = `crm:proposals:filters:${currentUser?.id || 'anon'}`
      let saved = localStorage.getItem(erpKey)
      if (!saved) {
        // tenta migrar do legado CRM
        const legacy = localStorage.getItem(crmKey)
        if (legacy) {
          localStorage.setItem(erpKey, legacy)
          try {
            localStorage.removeItem(crmKey)
          } catch {}
          saved = legacy
        }
      }
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          setFilters({ ...defaultFilters, ...parsed })
        }
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  useEffect(() => {
    try {
      const erpKey = `erp:proposals:filters:${currentUser?.id || 'anon'}`
      localStorage.setItem(erpKey, JSON.stringify(filters))
      // remove chave antiga silenciosamente
      try {
        localStorage.removeItem(`crm:proposals:filters:${currentUser?.id || 'anon'}`)
      } catch {}
    } catch (_) {}
  }, [filters, currentUser?.id])

  // (order fix) efeitos que dependem de filteredProposals movidos para depois da definição

  // SSE eventos de propostas (atualizações leves de status/claim) - somente analista/gestor
  const [liveUpdates, setLiveUpdates] = useState({})
  useEffect(() => {
    if (currentUser.tipo_usuario === 'consultor') return
    let es
    try {
      es = new EventSource('/api/proposals/events')
      es.addEventListener('proposta_update', (ev) => {
        try {
          const data = JSON.parse(ev.data)
          setLiveUpdates((prev) => ({ ...prev, [data.id]: data }))
        } catch (_) {}
      })
    } catch (_) {}
    return () => {
      try {
        es?.close()
      } catch (_) {}
    }
  }, [currentUser.tipo_usuario])

  // Merge live updates em proposals para exibição responsiva sem refetch completo
  const proposalsMerged = useMemo(() => {
    const map = new Map(proposals.map((p) => [p.id, p]))
    Object.entries(liveUpdates).forEach(([id, patch]) => {
      if (map.has(id)) {
        map.set(id, { ...map.get(id), ...patch })
      }
    })
    return Array.from(map.values())
  }, [proposals, liveUpdates])

  const deferredQ = useDeferredValue(filters.q)
  const filteredProposals = useMemo(() => {
    const qn = normalize(deferredQ)
    const list = proposalsMerged.filter((p) => {
      // Busca
      if (qn) {
        const cnpjDigits = String(p.cnpj || '').replace(/\D/g, '')
        const haystack = [cnpjDigits, p.consultor, p.codigo, p.operadora, p.cliente_nome]
          .filter(Boolean)
          .map(normalize)
        if (!haystack.some((h) => h.includes(qn))) return false
      }
      if (filters.status !== 'todos' && p.status !== filters.status) return false
      if (filters.operadora !== 'todas' && p.operadora !== filters.operadora) return false
      if (
        currentUser.tipo_usuario === 'gestor' &&
        filters.analista !== 'todos' &&
        String(p.criado_por) !== String(filters.analista)
      )
        return false
      if (
        currentUser.tipo_usuario === 'gestor' &&
        filters.consultor !== 'todos' &&
        p.consultor !== filters.consultor
      )
        return false
      return true
    })
    const sorted = list.slice().sort((a, b) => {
      if (['analista_implantacao', 'analista_movimentacao'].includes(currentUser.tipo_usuario)) {
        const aFree = !a.atendido_por
        const bFree = !b.atendido_por
        if (aFree !== bFree) return aFree ? -1 : 1
      }
      const va = Number(a?.quantidade_vidas || 0)
      const vb = Number(b?.quantidade_vidas || 0)
      if (va !== vb) return vidasSortAsc ? va - vb : vb - va
      const ca = a?.codigo || ''
      const cb = b?.codigo || ''
      if (ca && cb) {
        const cmp = ca.localeCompare(cb, undefined, { numeric: true, sensitivity: 'base' })
        if (cmp !== 0) return cmp
      }
      const da = a?.criado_em ? new Date(a.criado_em).getTime() : 0
      const db = b?.criado_em ? new Date(b.criado_em).getTime() : 0
      return da - db
    })
    return sorted
  }, [proposalsMerged, filters, currentUser.tipo_usuario, vidasSortAsc, deferredQ])

  // Alertas em tempo real de SLA estourado (analista/gestor)
  useEffect(() => {
    if (!filteredProposals.length) return
    if (currentUser.tipo_usuario === 'consultor') return
    const now = Date.now()
    // Persistência leve para não repetir alertas em page reload: sessionStorage
    let persisted = {}
    try {
      persisted = JSON.parse(sessionStorage.getItem('erp:proposalAlerts') || '{}')
      if (!Object.keys(persisted).length) {
        // migrar do legado
        const legacy = sessionStorage.getItem('crm:proposalAlerts')
        if (legacy) {
          persisted = JSON.parse(legacy)
          try {
            sessionStorage.setItem('erp:proposalAlerts', legacy)
            sessionStorage.removeItem('crm:proposalAlerts')
          } catch {}
        }
      }
    } catch {}
    let changed = false
    filteredProposals.forEach((p) => {
      if (p.atendido_por) return
      const created = new Date(p.criado_em).getTime()
      if (isNaN(created)) return
      const hours = (now - created) / 1000 / 3600
      // SLA básico
      if (hours >= SLA_THRESHOLD_HOURS && !slaAlertedRef.current.has(p.id)) {
        slaAlertedRef.current.add(p.id)
        toast.error(
          `SLA estourado: proposta ${p.codigo || p.id.slice(0, 8)} aguardando há ${hours.toFixed(1)}h`
        )
        persisted[p.id] = { lastAlert: Date.now(), type: 'sla' }
        changed = true
      }
      // Aging > 24h informativo
      if (hours >= AGE_ALERT_HOURS && !slaAlertedRef.current.has('age:' + p.id)) {
        slaAlertedRef.current.add('age:' + p.id)
        toast.info(`Proposta ${p.codigo || p.id.slice(0, 8)} parada há ${Math.floor(hours)}h`)
        persisted[p.id] = { lastAlert: Date.now(), type: 'age24' }
        changed = true
      }
      // Aging forte > 48h
      if (hours >= AGE_STRONG_ALERT_HOURS && !slaAlertedRef.current.has('ageStrong:' + p.id)) {
        slaAlertedRef.current.add('ageStrong:' + p.id)
        toast.error(
          `Proposta ${p.codigo || p.id.slice(0, 8)} parada há ${Math.floor(hours)}h (atenção)`
        )
        persisted[p.id] = { lastAlert: Date.now(), type: 'age48' }
        changed = true
      }
    })
    if (changed) {
      try {
        sessionStorage.setItem('erp:proposalAlerts', JSON.stringify(persisted))
        sessionStorage.removeItem('crm:proposalAlerts')
      } catch {}
    }
  }, [filteredProposals, currentUser.tipo_usuario])

  // Limpa cache de alertas para propostas removidas
  useEffect(() => {
    const ids = new Set(filteredProposals.map((p) => p.id))
    slaAlertedRef.current.forEach((id) => {
      if (!ids.has(id)) slaAlertedRef.current.delete(id)
    })
  }, [filteredProposals])

  const activeFilters = useMemo(() => {
    const items = []
    if (filters.status !== 'todos')
      items.push({ key: 'status', label: `status: ${filters.status}` })
    if (filters.operadora !== 'todas')
      items.push({ key: 'operadora', label: `operadora: ${filters.operadora}` })
    if (currentUser.tipo_usuario === 'gestor' && filters.analista !== 'todos') {
      const analistaNome =
        users.find((u) => String(u.id) === String(filters.analista))?.nome || filters.analista
      items.push({ key: 'analista', label: `analista: ${analistaNome}` })
    }
    if (currentUser.tipo_usuario === 'gestor' && filters.consultor !== 'todos') {
      items.push({ key: 'consultor', label: `consultor: ${filters.consultor}` })
    }
    if (filters.q && filters.q.trim())
      items.push({ key: 'q', label: `busca: "${filters.q.trim()}"` })
    return items
  }, [filters, currentUser.tipo_usuario, users])

  const clearFilter = (key) => {
    setFilters((prev) => {
      if (key === 'status') return { ...prev, status: 'todos' }
      if (key === 'operadora') return { ...prev, operadora: 'todas' }
      if (key === 'analista') return { ...prev, analista: 'todos' }
      if (key === 'consultor') return { ...prev, consultor: 'todos' }
      if (key === 'q') return { ...prev, q: '' }
      return prev
    })
  }

  // Escuta comando global para focar em um código PRP específico
  useEffect(() => {
    const handler = (ev) => {
      try {
        const code = String(ev?.detail?.code || '').trim()
        if (!code) return
        setFilters((prev) => ({ ...prev, q: code }))
      } catch (_) {}
    }
    try {
      window.addEventListener('proposals:focus-code', handler)
    } catch (_) {}
    return () => {
      try {
        window.removeEventListener('proposals:focus-code', handler)
      } catch (_) {}
    }
  }, [])

  const consultores = useMemo(() => {
    return Array.from(new Set(proposals.map((p) => p.consultor).filter(Boolean))).sort((a, b) =>
      normalize(a).localeCompare(normalize(b))
    )
  }, [proposals])

  const openEditDialog = (p) => {
    setEditDialogFor(p)
    setEditForm({
      operadora: p.operadora || '',
      quantidade_vidas: String(p.quantidade_vidas ?? ''),
      valor: String(p.valor ?? ''),
      previsao_implantacao: p.previsao_implantacao
        ? String(p.previsao_implantacao).slice(0, 10)
        : '',
      consultor: p.consultor || '',
      consultor_email: p.consultor_email || '',
      criado_por: String(p.criado_por || ''),
    })
  }
  const closeEditDialog = () => {
    setEditDialogFor(null)
    setEditForm({
      operadora: '',
      quantidade_vidas: '',
      valor: '',
      previsao_implantacao: '',
      consultor: '',
      consultor_email: '',
      criado_por: '',
    })
  }
  const saveEditDialog = async () => {
    if (!editDialogFor) return
    const payload = {
      operadora: editForm.operadora,
      quantidade_vidas: Number(editForm.quantidade_vidas || 0),
      valor: Number(editForm.valor || 0),
      previsao_implantacao: editForm.previsao_implantacao || null,
      consultor: editForm.consultor,
      consultor_email: editForm.consultor_email,
      criado_por: editForm.criado_por,
    }
    const res = await onPatchProposal?.(editDialogFor.id, payload)
    if (res?.ok) closeEditDialog()
  }

  // Estados e lógica de criação movidos para NovaPropostaDialog

  const groupedByStatus = useMemo(() => {
    const map = {}
    for (const s of statusOptions) map[s] = []
    for (const p of filteredProposals) {
      const st = p.status || statusOptions[0] || 'recepcionado'
      if (!map[st]) map[st] = []
      map[st].push(p)
    }
    return map
  }, [filteredProposals, statusOptions])

  // Helpers SLA/aging
  const hoursBetween = (a, b) => {
    try {
      const ta = new Date(a).getTime()
      const tb = new Date(b).getTime()
      if (isNaN(ta) || isNaN(tb)) return 0
      return (tb - ta) / 1000 / 3600
    } catch {
      return 0
    }
  }
  const ageHours = (p) => hoursBetween(p.criado_em, new Date())

  const prefetchDetails = useCallback((id) => {
    queryClient.prefetchQuery({
      queryKey: ['proposals', id],
      queryFn: async () => {
        const r = await fetch(`/api/proposals/${id}`)
        if (!r.ok) throw new Error('Erro ao pré-carregar')
        return r.json()
      },
      staleTime: 60_000,
    })
  }, [])

  const openDetails = useCallback(
    async (id) => {
      const prop = proposals.find((p) => p.id === id)
      setDetail(prop || null)
      setDetailLoading(true)
      setDetailOpen(true)
      try {
        const res = await fetch(`/api/proposals/${id}`, { credentials: 'include' })
        const data = await res.json().catch(() => null)
        if (res.ok && data) setDetail(data)
      } finally {
        setDetailLoading(false)
      }
    },
    [proposals]
  )

  return (
    <div className="space-y-6">
      {currentUser.tipo_usuario === 'consultor' && (
        <Card className="border-amber-300/60 bg-secondary dark:bg-amber-950/20">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Como funciona:</CardTitle>
            <CardDescription>
              Solicite a proposta e acompanhe quando um analista assumir.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs space-y-1">
            <p>
              <strong>1.</strong> Clique em &quot;Solicitar Proposta&quot; e preencha os dados.
            </p>
            <p>
              <strong>2.</strong> O status inicial será sempre{' '}
              <span className="font-semibold">recepcionado</span>.
            </p>
            <p>
              <strong>3.</strong> Um analista clica em &quot;Assumir&quot; e passa a atualizar o
              status.
            </p>
            <p>
              <strong>4.</strong> Você vê o nome do analista no cartão quando atribuído.
            </p>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {currentUser.tipo_usuario === 'gestor' && 'Monitorar Propostas'}
            {currentUser.tipo_usuario === 'gerente' && 'Gerenciar Propostas'}
            {['analista_implantacao', 'analista_movimentacao'].includes(currentUser.tipo_usuario) &&
              'Gerenciar Propostas'}
            {currentUser.tipo_usuario === 'consultor' && 'Minhas Propostas'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentUser.tipo_usuario === 'gestor' &&
              'Crie, monitore e gerencie todas as propostas'}
            {currentUser.tipo_usuario === 'gerente' && 'Crie, monitore e gerencie propostas'}
            {['analista_implantacao', 'analista_movimentacao'].includes(currentUser.tipo_usuario) &&
              'Crie, edite e gerencie suas propostas'}
            {currentUser.tipo_usuario === 'consultor' &&
              'Crie novas propostas e acompanhe o andamento'}
          </p>
        </div>
        {[
          'analista_implantacao',
          'analista_movimentacao',
          'gerente',
          'gestor',
          'consultor',
        ].includes(currentUser.tipo_usuario) && (
          <>
            <Button
              className="self-start"
              data-new-proposal-btn
              onClick={() => setIsDialogOpen(true)}
            >
              <PlusCircle className="w-4 h-4 mr-2" />{' '}
              {currentUser.tipo_usuario === 'consultor' ? 'Solicitar Proposta' : 'Nova Proposta'}
            </Button>
            <NovaPropostaDialog
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              currentUser={currentUser}
              operadoras={operadoras}
              statusOptions={statusOptions}
              onCreateProposal={onCreateProposal}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Propostas (Kanban)</CardTitle>
              <CardDescription>
                {filteredProposals.length} de {proposals.length} proposta(s) filtradas
              </CardDescription>
              {slaSummary &&
                (() => {
                  const sla = Number(slaSummary.sla_medio_horas)
                  const slaFmt = Number.isFinite(sla) ? sla.toFixed(2) : '—'
                  const aguardando =
                    typeof slaSummary.aguardando_analista === 'number'
                      ? slaSummary.aguardando_analista
                      : '—'
                  return (
                    <p className="text-xs text-muted-foreground mt-1">
                      SLA médio para assumir: {slaFmt}h • Aguardando analista: {aguardando}
                    </p>
                  )
                })()}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => exportCsv(filteredProposals)}
              >
                Exportar CSV
              </Button>
            </div>
          </div>
          {activeFilters.length > 0 && (
            <div className="text-xs mt-1 flex items-center flex-wrap gap-2">
              {activeFilters.map((f) => (
                <Badge key={f.key} variant="secondary" className="gap-1">
                  <span>{f.label}</span>
                  <button
                    type="button"
                    aria-label={`Remover filtro ${f.key}`}
                    className="ml-1 opacity-80 hover:opacity-100"
                    onClick={() => clearFilter(f.key)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-2 lg:col-span-2">
              <Label>Busca</Label>
              <Input
                placeholder="CNPJ, consultor ou código"
                value={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, status: v }))}
              >
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
            <div className="space-y-2">
              <Label>Operadora</Label>
              <Select
                value={filters.operadora}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, operadora: v }))}
              >
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
            {currentUser.tipo_usuario === 'gestor' && (
              <div className="space-y-2">
                <Label>Analista</Label>
                <Select
                  value={filters.analista}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, analista: v }))}
                >
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
            {currentUser.tipo_usuario === 'gestor' && (
              <div className="space-y-2">
                <Label>Consultor</Label>
                <Select
                  value={filters.consultor}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, consultor: v }))}
                >
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
            <div className="space-y-2 flex flex-col justify-end">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setVidasSortAsc((v) => !v)}
                  title={vidasSortAsc ? 'Ordenar vidas decrescente' : 'Ordenar vidas crescente'}
                >
                  <ArrowUpDown className="w-4 h-4 mr-1" />
                  {vidasSortAsc ? 'Vidas ↑' : 'Vidas ↓'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setFilters(defaultFilters)}
                >
                  Limpar
                </Button>
              </div>
            </div>
          </div>

          {/* Kanban horizontal */}
          <div className="overflow-x-auto pb-2 -m-1 pl-1" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex gap-4 min-h-[300px] w-max pr-4">
              {statusOptions.map((status) => {
                const statusColors = STATUS_COLORS[status] || {
                  bg: '#f6f6f6',
                  text: '#333333',
                  border: '#e2e2e2',
                }
                return (
                  <div
                    key={status}
                    className="border rounded-md bg-card flex flex-col max-h-[560px] shadow-sm overflow-hidden min-w-[300px] w-[300px]"
                  >
                    <div
                      className="p-2 border-b flex items-center gap-2 text-sm font-medium capitalize sticky top-0 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border"
                      style={{
                        backgroundColor: statusColors.bg,
                        color: statusColors.text,
                        borderColor: statusColors.border,
                      }}
                    >
                      <span>{status}</span>
                      <span className="ml-auto text-xs tabular-nums opacity-70">
                        {groupedByStatus[status]?.length || 0}
                      </span>
                    </div>
                    <div className="p-2 overflow-y-auto custom-scrollbar">
                      {(!groupedByStatus[status] || groupedByStatus[status].length === 0) && (
                        <div className="text-[11px] text-muted-foreground italic px-2 py-4 border border-dashed rounded bg-background/40">
                          Nenhuma proposta
                        </div>
                      )}
                      {groupedByStatus[status] && groupedByStatus[status].length > 0 && (
                        <VirtualList
                          height={780}
                          itemCount={groupedByStatus[status].length}
                          itemSize={212}
                          width={270}
                          className="pr-2"
                        >
                          {({ index, style }) => {
                            const p = groupedByStatus[status][index]
                            const isHandler = String(p.atendido_por) === String(currentUser.id)
                            const canEdit =
                              ['gestor', 'gerente'].includes(currentUser.tipo_usuario) ||
                              (['analista_implantacao', 'analista_movimentacao'].includes(
                                currentUser.tipo_usuario
                              ) &&
                                isHandler)
                            const busy = !!updatingStatus[p.id]
                            const isWaiting = !p.atendido_por
                            const isLate = isWaiting && ageHours(p) > SLA_THRESHOLD_HOURS
                            const ageClass =
                              p.horas_em_analise >= 48
                                ? 'before:bg-gradient-to-b before:from-red-500 before:to-red-700'
                                : p.horas_em_analise >= 24
                                  ? 'before:bg-gradient-to-b before:from-amber-400 before:to-amber-600'
                                  : 'before:bg-gradient-to-b before:from-transparent before:to-transparent'
                            const statusColors = STATUS_COLORS[status] || {
                              bg: '#f6f6f6',
                              text: '#333333',
                              border: '#e2e2e2',
                            }
                            return (
                              <div key={p.id} style={style} className="w-full h-full">
                                <div className="h-full p-2">
                                  <div
                                    style={{
                                      backgroundColor: statusColors.bg,
                                      color: statusColors.text,
                                      borderColor: statusColors.border,
                                    }}
                                    className={`rounded p-2 h-full backdrop-blur text-xs space-y-1 border relative group transition-colors hover:border-primary/60 hover:shadow-md ${isWaiting ? (isLate ? 'ring-2 ring-red-400' : 'ring-1 ring-amber-300') : ''} before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l before:transition-all before:duration-300 ${ageClass}`}
                                  >
                                    {/* zebra effect via idx */}
                                    <div className="absolute inset-0 pointer-events-none rounded opacity-0 group-hover:opacity-5 transition-opacity bg-primary" />
                                    <div
                                      className="font-medium truncate flex items-center gap-1 flex-wrap"
                                      title={p.consultor}
                                      onMouseEnter={() => prefetchDetails(p.id)}
                                    >
                                      <span
                                        className="font-mono text-[10px] px-1 py-0.5 rounded flex items-center gap-1"
                                        style={{
                                          backgroundColor: statusColors.bg,
                                          color: '#000000 !important',
                                          fontWeight: 'bold',
                                          border: `1px solid ${statusColors.border}`,
                                        }}
                                      >
                                        {p.codigo || '—'}
                                        {typeof p.horas_em_analise === 'number' && (
                                          <span
                                            title={`Horas em análise: ${p.horas_em_analise}`}
                                            className={
                                              `inline-flex items-center gap-0.5 rounded px-1 text-[9px] font-semibold border ` +
                                              (p.horas_em_analise >= AGE_STRONG_ALERT_HOURS
                                                ? 'bg-red-600 text-white border-red-700'
                                                : p.horas_em_analise >= AGE_ALERT_HOURS
                                                  ? 'bg-amber-500 text-black border-amber-600'
                                                  : 'bg-gray-200 text-gray-700 border-gray-300')
                                            }
                                          >
                                            <Clock className="w-3 h-3" />
                                            {p.horas_em_analise >= 48
                                              ? `${Math.floor(p.horas_em_analise / 24)}d`
                                              : `${p.horas_em_analise}h`}
                                          </span>
                                        )}
                                      </span>
                                      <OperadoraBadge
                                        nome={p.operadora}
                                        className="truncate max-w-[120px]"
                                        size={14}
                                      />
                                      {isWaiting && (
                                        <span
                                          className={`ml-auto inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded ${isLate ? 'bg-red-600' : 'bg-amber-500'} text-white font-semibold tracking-wide uppercase whitespace-nowrap`}
                                        >
                                          {isLate ? 'SLA!' : 'Livre'}
                                        </span>
                                      )}
                                      {p.atendido_por && p.status === 'implantado' && (
                                        <span className="ml-auto inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-green-600 text-white font-semibold tracking-wide uppercase">
                                          Implantado
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                                      <span
                                        className="font-mono col-span-2 truncate"
                                        title={p.cnpj}
                                      >
                                        {formatCNPJ(p.cnpj)}
                                      </span>
                                      <span
                                        className="truncate"
                                        title={`${p.quantidade_vidas} vidas`}
                                      >
                                        {p.quantidade_vidas} vidas
                                      </span>
                                      <span className="truncate" title={formatCurrency(p.valor)}>
                                        {formatCurrency(p.valor)}
                                      </span>
                                    </div>
                                    {/* Solicitante visível antes de assumir */}
                                    {isWaiting && p.consultor && (
                                      <div
                                        className="text-[10px] text-muted-foreground truncate"
                                        title={`Consultor solicitante: ${p.consultor}`}
                                      >
                                        Solicitado por: {p.consultor}
                                      </div>
                                    )}
                                    {isWaiting && (
                                      <div className="text-[10px] text-muted-foreground">
                                        Aguardando há {ageHours(p).toFixed(1)}h
                                      </div>
                                    )}
                                    {(p.cliente_nome || p.cliente_email) && (
                                      <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                                        <span
                                          className="truncate max-w-[160px]"
                                          title={p.cliente_nome}
                                        >
                                          {p.cliente_nome}
                                        </span>
                                        {p.cliente_email && (
                                          <span
                                            className="truncate max-w-[160px]"
                                            title={p.cliente_email}
                                          >
                                            ({p.cliente_email})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {/* Ações */}
                                    <div className="flex gap-1 flex-wrap items-center pt-1">
                                      <button
                                        type="button"
                                        onClick={() => openDetails(p.id)}
                                        className="px-2 py-0.5 text-[11px] rounded bg-secondary text-secondary-foreground hover:brightness-105"
                                      >
                                        Ver detalhes
                                      </button>
                                      {canEdit && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button
                                              type="button"
                                              disabled={busy}
                                              className="px-2 py-0.5 text-[11px] rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                                            >
                                              {busy ? '...' : 'Alterar Status'}
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="start" className="w-44">
                                            <DropdownMenuLabel className="text-[11px]">
                                              Alterar status
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {statusOptions
                                              .filter((s) => s !== p.status)
                                              .map((next) => (
                                                <DropdownMenuItem
                                                  key={next}
                                                  className="text-[12px] capitalize"
                                                  disabled={busy}
                                                  onClick={async () => {
                                                    try {
                                                      setUpdatingStatus((prev) => ({
                                                        ...prev,
                                                        [p.id]: true,
                                                      }))
                                                      await onUpdateProposalStatus(p.id, next, p)
                                                    } finally {
                                                      setUpdatingStatus((prev) => ({
                                                        ...prev,
                                                        [p.id]: false,
                                                      }))
                                                    }
                                                  }}
                                                >
                                                  {next}
                                                </DropdownMenuItem>
                                              ))}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                      {currentUser.tipo_usuario === 'gestor' && (
                                        <button
                                          type="button"
                                          onClick={() => openEditDialog(p)}
                                          className="px-2 py-0.5 text-[11px] rounded border bg-background hover:bg-muted text-white"
                                        >
                                          Editar
                                        </button>
                                      )}
                                      {['analista_implantacao', 'analista_movimentacao'].includes(
                                        currentUser.tipo_usuario
                                      ) &&
                                        !p.atendido_por && (
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              try {
                                                setUpdatingStatus((prev) => ({
                                                  ...prev,
                                                  [p.id]: true,
                                                }))
                                                await onPatchProposal?.(p.id, { claim: true })
                                              } finally {
                                                setUpdatingStatus((prev) => ({
                                                  ...prev,
                                                  [p.id]: false,
                                                }))
                                              }
                                            }}
                                            className="px-2 py-0.5 text-[11px] rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                            disabled={!!updatingStatus[p.id]}
                                          >
                                            Assumir
                                          </button>
                                        )}
                                      {(() => {
                                        let handlerId = p.atendido_por
                                        if (!handlerId && p.status === 'implantado') {
                                          const creatorIsAnalyst = users.some(
                                            (u) =>
                                              u.id === p.criado_por &&
                                              [
                                                'analista_implantacao',
                                                'analista_movimentacao',
                                              ].includes(u.tipo_usuario)
                                          )
                                          if (creatorIsAnalyst) handlerId = p.criado_por
                                        }
                                        const nome = handlerId
                                          ? users.find((u) => u.id === handlerId)?.nome || '—'
                                          : '—'
                                        return (
                                          <span className="text-[10px] text-white-foreground">
                                            {`Atendido por: ${nome}`}
                                          </span>
                                        )
                                      })()}
                                    </div>
                                    {currentUser.tipo_usuario === 'gestor' && (
                                      <div className="text-[10px] text-white-foreground">
                                        Analista:{' '}
                                        {users.find((u) => u.id === p.criado_por)?.nome || '-'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          }}
                        </VirtualList>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Linha do Tempo - Para Analistas de Implantação */}
          {currentUser.tipo_usuario === 'analista_implantacao' && (
            <div className="mt-6">
              <ProposalsTimeline proposals={filteredProposals} currentUser={currentUser} />
            </div>
          )}

          {auditOpenFor && <AuditDrawer id={auditOpenFor} onClose={() => setAuditOpenFor(null)} />}

          {/* Dialog edição gestor */}
          <Dialog
            open={!!editDialogFor}
            onOpenChange={(v) => {
              if (!v) closeEditDialog()
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar proposta</DialogTitle>
                <DialogDescription>Atualize os dados da proposta.</DialogDescription>
              </DialogHeader>
              {editDialogFor && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Operadora</Label>
                      <Select
                        value={editForm.operadora}
                        onValueChange={(v) => setEditForm((prev) => ({ ...prev, operadora: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {operadoras.map((op) => (
                            <SelectItem key={op} value={op}>
                              {op}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantidade de Vidas</Label>
                      <Input
                        type="number"
                        value={editForm.quantidade_vidas}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, quantidade_vidas: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor do Plano</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm.valor}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, valor: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Início de Vigência</Label>
                      <Input
                        type="date"
                        value={editForm.previsao_implantacao}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, previsao_implantacao: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Consultor</Label>
                      <Input
                        value={editForm.consultor}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, consultor: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email do Consultor</Label>
                      <Input
                        type="email"
                        value={editForm.consultor_email}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, consultor_email: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Analista</Label>
                    <Select
                      value={editForm.criado_por}
                      onValueChange={(v) => setEditForm((prev) => ({ ...prev, criado_por: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeEditDialog}>
                      Cancelar
                    </Button>
                    <Button onClick={saveEditDialog}>Salvar</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Overlay detalhes */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2">
          <div className="bg-background w-full max-w-2xl rounded-md border shadow-lg max-h-[90vh] overflow-y-auto p-4 space-y-4">
            <div className="flex items-start gap-2">
              <h3 className="font-semibold text-lg">
                Detalhes da Proposta{' '}
                {detail?.codigo && (
                  <span
                    className="font-mono text-xs px-1 py-0.5 rounded ml-2"
                    style={{
                      backgroundColor: (STATUS_COLORS[detail?.status] || { bg: '#f6f6f6' }).bg,
                      fontWeight: 'bold',
                      color: (STATUS_COLORS[detail?.status] || { text: '#333333' }).text,
                      border: `1px solid ${(STATUS_COLORS[detail?.status] || { border: '#e2e2e2' }).border}`,
                    }}
                  >
                    {detail.codigo}
                  </span>
                )}
              </h3>
              <button
                className="ml-auto text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setDetailOpen(false)}
              >
                Fechar
              </button>
            </div>
            {detailLoading && <p className="text-sm">Carregando...</p>}
            {!detailLoading && detail && (
              <div className="space-y-6 text-sm">
                {/* Blocos superiores: Consultor / Analista */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-md border bg-muted/20 space-y-2">
                    <h4 className="font-semibold text-xs tracking-wide uppercase text-muted-foreground">
                      Consultor
                    </h4>
                    <div>
                      <span className="font-medium">Nome:</span> {detail.consultor || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {detail.consultor_email || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Cliente:</span> {detail.cliente_nome || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Email Cliente:</span>{' '}
                      {detail.cliente_email || '—'}
                    </div>
                  </div>
                  <div className="p-4 rounded-md border bg-muted/20 space-y-2">
                    <h4 className="font-semibold text-xs tracking-wide uppercase text-muted-foreground">
                      Analista
                    </h4>
                    {(() => {
                      const nomeResp = detail.atendido_por
                        ? users.find((u) => u.id === detail.atendido_por)?.nome || '—'
                        : '—'
                      return (
                        <>
                          <div>
                            <span className="font-medium">Responsável Atual:</span> {nomeResp}
                          </div>
                          <div>
                            <span className="font-medium">Assumido em:</span>{' '}
                            {detail.atendido_em
                              ? new Date(detail.atendido_em).toLocaleString('pt-BR')
                              : '—'}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> {detail.status}
                          </div>
                          <div>
                            <span className="font-medium">Previsão Implantação:</span>{' '}
                            {detail.previsao_implantacao
                              ? new Date(detail.previsao_implantacao).toLocaleDateString('pt-BR')
                              : '—'}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
                {/* Dados gerais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-md border bg-background/50 space-y-1">
                    <h4 className="font-semibold text-xs tracking-wide uppercase text-muted-foreground">
                      Dados da Proposta
                    </h4>
                    <div>
                      <span className="font-medium">CNPJ:</span> {formatCNPJ(detail.cnpj)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Operadora:</span>{' '}
                      <OperadoraBadge nome={detail.operadora} />
                    </div>
                    <div>
                      <span className="font-medium">Vidas:</span> {detail.quantidade_vidas}
                    </div>
                    <div>
                      <span className="font-medium">Valor:</span> {formatCurrency(detail.valor)}
                    </div>
                  </div>
                  <div className="p-4 rounded-md border bg-background/50 space-y-2">
                    <h4 className="font-semibold text-xs tracking-wide uppercase text-muted-foreground">
                      Observações Cliente
                    </h4>
                    <p className="text-xs whitespace-pre-wrap border rounded p-2 bg-muted/30 min-h-[60px]">
                      {detail.observacoes_cliente || '—'}
                    </p>
                  </div>
                </div>
                {/* Tags & Notas */}
                <ProposalTagsNotes
                  proposalId={detail.id}
                  canManage={currentUser.tipo_usuario !== 'consultor'}
                />
                {/* Documentos Anexados */}
                <ProposalFilesList proposalId={detail.id} currentUser={currentUser} />
                {currentUser.tipo_usuario === 'gestor' && (
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAuditOpenFor(detail.id)
                        setDetailOpen(false)
                      }}
                    >
                      Ver Histórico
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Componente de tags e notas internas
function ProposalTagsNotes({ proposalId, canManage }) {
  const [tags, setTags] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTag, setNewTag] = useState('')
  const [newNote, setNewNote] = useState('')
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [rt, rn] = await Promise.all([
          fetch(`/api/proposals/tags?proposta_id=${proposalId}`, { credentials: 'include' }),
          fetch(`/api/proposals/notes?proposta_id=${proposalId}`, { credentials: 'include' }),
        ])
        if (rt.ok) {
          const d = await rt.json()
          if (mounted) setTags(Array.isArray(d) ? d : [])
        }
        if (rn.ok) {
          const d2 = await rn.json()
          if (mounted) setNotes(Array.isArray(d2) ? d2 : [])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [proposalId])

  const addTag = async () => {
    if (!newTag.trim()) return
    const res = await fetch('/api/proposals/tags', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposta_id: proposalId, tag: newTag }),
    })
    if (res.ok) {
      setNewTag('')
      const d = await fetch(`/api/proposals/tags?proposta_id=${proposalId}`, {
        credentials: 'include',
      })
      if (d.ok) setTags(await d.json())
    }
  }
  const removeTag = async (tag) => {
    const res = await fetch(
      `/api/proposals/tags?proposta_id=${proposalId}&tag=${encodeURIComponent(tag)}`,
      { method: 'DELETE', credentials: 'include' }
    )
    if (res.ok) {
      setTags(tags.filter((t) => t.tag !== tag))
    }
  }
  const addNote = async () => {
    if (!newNote.trim()) return
    const res = await fetch('/api/proposals/notes', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposta_id: proposalId, nota: newNote }),
    })
    if (res.ok) {
      setNewNote('')
      const d = await fetch(`/api/proposals/notes?proposta_id=${proposalId}`, {
        credentials: 'include',
      })
      if (d.ok) setNotes(await d.json())
    }
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div>
        <h4 className="font-semibold text-sm mb-2">Tags</h4>
        {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}
        {!loading && (
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((t) => (
              <span
                key={t.tag}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] px-2 py-1 rounded"
              >
                {t.tag}
                {canManage && (
                  <button
                    onClick={() => removeTag(t.tag)}
                    className="hover:text-destructive"
                    title="Remover"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {tags.length === 0 && <span className="text-xs text-muted-foreground">Sem tags</span>}
          </div>
        )}
        {canManage && (
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="nova tag"
              className="h-8 text-xs"
            />
            <Button type="button" size="sm" onClick={addTag}>
              Adicionar
            </Button>
          </div>
        )}
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-2">Notas Internas</h4>
        {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}
        {!loading && (
          <div className="space-y-2 max-h-48 overflow-auto pr-1">
            {notes.map((n) => (
              <div key={n.id} className="p-2 rounded border text-xs bg-muted/30">
                <div className="text-[10px] text-muted-foreground mb-1">
                  {new Date(n.criado_em).toLocaleString('pt-BR')}
                </div>
                <div className="whitespace-pre-wrap break-words">{n.nota}</div>
              </div>
            ))}
            {notes.length === 0 && <span className="text-xs text-muted-foreground">Sem notas</span>}
          </div>
        )}
        {canManage && (
          <div className="flex gap-2 pt-2">
            <Input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Nova nota"
              className="h-8 text-xs"
            />
            <Button type="button" size="sm" onClick={addNote}>
              Salvar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// CSV Export
function exportCsv(rows) {
  if (!rows || rows.length === 0) {
    toast?.info?.('Nada para exportar')
    return
  }
  const headers = [
    'codigo',
    'cnpj',
    'operadora',
    'status',
    'consultor',
    'consultor_email',
    'cliente_nome',
    'cliente_email',
    'quantidade_vidas',
    'valor',
    'criado_em',
    'atendido_em',
  ]
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(';')),
  ].join('\n')
  try {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `propostas_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('CSV export error', e)
  }
}

function AuditDrawer({ id, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/proposals/${id}/audit`, { credentials: 'include' })
        const data = await res.json().catch(() => [])
        if (mounted) setItems(Array.isArray(data) ? data : [])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [id])
  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-card border w-full sm:max-w-2xl max-h-[80vh] overflow-auto rounded-t-xl sm:rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">Histórico de alterações</h3>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <div className="p-4 space-y-3 text-sm">
          {loading
            ? 'Carregando…'
            : items.length === 0
              ? 'Sem registros'
              : items.map((it) => (
                  <div key={it.id} className="p-3 rounded border">
                    <div className="text-xs text-muted-foreground">
                      {new Date(it.criado_em).toLocaleString('pt-BR')}
                    </div>
                    <pre className="text-xs whitespace-pre-wrap mt-1">
                      {JSON.stringify(it.changes, null, 2)}
                    </pre>
                  </div>
                ))}
        </div>
      </div>
    </div>
  )
}

// Componente de upload de documentos para propostas (implantação)
// Componente ProposalUploadDocs removido (substituído por versão em NovaPropostaDialog)

// Lista de documentos anexados a uma proposta (metadados em propostas_arquivos)
function ProposalFilesList({ proposalId, currentUser: _currentUser }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/proposals/files?proposta_id=${proposalId}`, {
        credentials: 'include',
      })
      if (!r.ok) {
        setError('Falha ao carregar')
        return
      }
      const j = await r.json().catch(() => ({}))
      setFiles(Array.isArray(j.data) ? j.data : [])
    } catch {
      setError('Erro de rede')
    } finally {
      setLoading(false)
    }
  }, [proposalId])
  useEffect(() => {
    load()
  }, [load])
  // Escuta evento disparado após upload/registro de docs
  useEffect(() => {
    const handler = (ev) => {
      if (ev?.detail?.id === proposalId) load()
    }
    window.addEventListener('proposta:docs-updated', handler)
    return () => window.removeEventListener('proposta:docs-updated', handler)
  }, [proposalId, load])
  if (!proposalId) return null
  return (
    <div className="space-y-2 border-t pt-4">
      <h4 className="font-semibold text-sm">Documentos</h4>
      {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}
      {!loading && error && <p className="text-xs text-destructive">{error}</p>}
      {!loading &&
        !error &&
        (files.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum documento registrado</p>
        ) : (
          <ul className="space-y-1 max-h-40 overflow-auto pr-1 text-xs">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-2 p-2 border rounded bg-muted/20">
                <span className="flex-1 truncate" title={f.nome_original || f.path}>
                  {f.nome_original || f.path}
                </span>
                {(() => {
                  // Preferir URL fornecida pela API (pública ou assinada)
                  let url = f.url || null
                  if (!url) {
                    // Fallback: montar a partir da NEXT_PUBLIC_SUPABASE_URL quando disponível
                    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
                    if (base) {
                      url = `${base.replace(/\/$/, '')}/storage/v1/object/public/${f.bucket}/${f.path}`
                    } else {
                      // Último fallback: relativo (pode falhar em prod se sem proxy)
                      url = `/${f.bucket}/${f.path}`
                    }
                  }
                  return (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      abrir
                    </a>
                  )
                })()}
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}
