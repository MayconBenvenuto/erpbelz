"use client"

import { useEffect, useMemo, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PlusCircle, X, ArrowUpDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { formatCurrency, formatCNPJ } from '@/lib/utils'

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
  // SLA & resumo com polling + alertas
  const [slaSummary, setSlaSummary] = useState(null)
  const SLA_THRESHOLD_HOURS = 8
  const slaAlertedRef = useRef(new Set())
  useEffect(() => {
    let stopped = false
    const intervalMs = 30_000
    const load = async () => {
      if (stopped) return
      try { const r = await fetch('/api/proposals/summary',{credentials:'include',cache:'no-store'}); if(r.ok){ setSlaSummary(await r.json()) } } catch(_){ }
      if (!stopped) setTimeout(load, intervalMs)
    }
    load()
    return () => { stopped = true }
  }, [])
  // Dialog criação
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [proposalForm, setProposalForm] = useState({
    cnpj: '',
    consultor: '',
    consultor_email: '',
  cliente_nome: '',
  cliente_email: '',
    operadora: '',
    quantidade_vidas: '',
    valor: '',
    previsao_implantacao: '',
    status: 'em análise'
  })
  // Validação / cache CNPJ
  // Resultado detalhado (somente gestor exibe após criação) - removido do layout por enquanto
  const [_cnpjValidationResult, setCnpjValidationResult] = useState(null)
  const [cnpjInfoCache, setCnpjInfoCache] = useState({}) // { [cnpj]: { loading, fetched, razao_social, nome_fantasia, error } }
  // Filtros
  const defaultFilters = { q: '', status: 'todos', operadora: 'todas', analista: 'todos', consultor: 'todos' }
  // Filtro extra: somente propostas livres (não atribuídas) para analista
  const [onlyFree, setOnlyFree] = useState(false)
  const [filters, setFilters] = useState(defaultFilters)
  const [vidasSortAsc, setVidasSortAsc] = useState(true)
  // Edição (gestor)
  const [editDialogFor, setEditDialogFor] = useState(null)
  const [editForm, setEditForm] = useState({ operadora: '', quantidade_vidas: '', valor: '', previsao_implantacao: '', consultor: '', consultor_email: '', criado_por: '' })
  // Futuro: incluir cliente_nome/cliente_email em edição se necessário
  const [updatingStatus, setUpdatingStatus] = useState({})
  const [auditOpenFor, setAuditOpenFor] = useState(null)
  // Detalhes
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState(null)

  const formatMoneyBR = (value) => {
    const digits = String(value || '').replace(/\D/g, '')
    if (!digits) return ''
    const number = parseInt(digits, 10) / 100
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number)
  }

  // normalize com cache simples para performance em filtros grandes
  const normalizeCacheRef = useRef(new Map())
  const normalize = (s) => {
    const key = s || ''
    const cache = normalizeCacheRef.current
    if (cache.has(key)) return cache.get(key)
    const v = String(key).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    if (cache.size > 5000) cache.clear()
    cache.set(key, v)
    return v
  }

  // Persistência de filtros por usuário
  useEffect(() => {
    try {
      const key = `crm:proposals:filters:${currentUser?.id || 'anon'}`
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        // valida chaves básicas
        if (parsed && typeof parsed === 'object') {
          setFilters({ ...defaultFilters, ...parsed })
        }
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  useEffect(() => {
    try {
      const key = `crm:proposals:filters:${currentUser?.id || 'anon'}`
      localStorage.setItem(key, JSON.stringify(filters))
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
          setLiveUpdates(prev => ({ ...prev, [data.id]: data }))
        } catch(_){}
      })
    } catch(_){}
    return () => { try { es?.close() } catch(_){} }
  }, [currentUser.tipo_usuario])

  // Merge live updates em proposals para exibição responsiva sem refetch completo
  const proposalsMerged = useMemo(() => {
    const map = new Map(proposals.map(p => [p.id, p]))
    Object.entries(liveUpdates).forEach(([id, patch]) => {
      if (map.has(id)) {
        map.set(id, { ...map.get(id), ...patch })
      }
    })
    return Array.from(map.values())
  }, [proposals, liveUpdates])

  const filteredProposals = useMemo(() => {
    const qn = normalize(filters.q)
    const list = proposalsMerged.filter(p => {
      const cnpjDigits = String(p.cnpj || '').replace(/\D/g, '')
      const cnpjFmt = formatCNPJ(p.cnpj)
      const consultor = normalize(p.consultor)
      const matchText = !qn || normalize(cnpjFmt).includes(qn) || cnpjDigits.includes(filters.q.replace(/\D/g, '')) || consultor.includes(qn)
      const matchStatus = filters.status === 'todos' || normalize(p.status) === normalize(filters.status)
      const matchOperadora = filters.operadora === 'todas' || normalize(p.operadora) === normalize(filters.operadora)
      const matchAnalista = currentUser.tipo_usuario !== 'gestor' || filters.analista === 'todos' || String(p.criado_por) === String(filters.analista)
      const matchConsultor = currentUser.tipo_usuario !== 'gestor' || filters.consultor === 'todos' || normalize(p.consultor) === normalize(filters.consultor)
      const matchCodigo = !qn || (p.codigo && String(p.codigo).toLowerCase().includes(qn))
      const matchFree = !onlyFree || !p.atendido_por
      return matchText && matchCodigo && matchStatus && matchOperadora && matchAnalista && matchConsultor && matchFree
    })
    const sorted = list.slice().sort((a,b) => {
      if (currentUser.tipo_usuario === 'analista') {
        const aFree = !a.atendido_por
        const bFree = !b.atendido_por
        if (aFree !== bFree) return aFree ? -1 : 1
      }
      const va = Number(a?.quantidade_vidas || 0)
      const vb = Number(b?.quantidade_vidas || 0)
      if (va !== vb) return vidasSortAsc ? va - vb : vb - va
      const ca = a?.codigo || ''
      const cb = b?.codigo || ''
      if (ca && cb) return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: 'base' })
      if (ca) return -1
      if (cb) return 1
      const da = a?.criado_em ? new Date(a.criado_em).getTime() : 0
      const db = b?.criado_em ? new Date(b.criado_em).getTime() : 0
      return da - db
    })
    return sorted
  }, [proposalsMerged, filters, currentUser.tipo_usuario, vidasSortAsc, onlyFree])

  // Alertas em tempo real de SLA estourado (analista/gestor)
  useEffect(() => {
    if (!filteredProposals.length) return
    if (currentUser.tipo_usuario === 'consultor') return
    const now = Date.now()
    filteredProposals.forEach(p => {
      if (p.atendido_por) return
      const created = new Date(p.criado_em).getTime()
      if (isNaN(created)) return
      const hours = (now - created)/1000/3600
      if (hours >= SLA_THRESHOLD_HOURS && !slaAlertedRef.current.has(p.id)) {
        slaAlertedRef.current.add(p.id)
        toast.error(`SLA estourado: proposta ${p.codigo || p.id.slice(0,8)} aguardando há ${hours.toFixed(1)}h`)
      }
    })
  }, [filteredProposals, currentUser.tipo_usuario])

  // Limpa cache de alertas para propostas removidas
  useEffect(() => {
    const ids = new Set(filteredProposals.map(p=>p.id))
    slaAlertedRef.current.forEach(id => { if(!ids.has(id)) slaAlertedRef.current.delete(id) })
  }, [filteredProposals])

  const activeFilters = useMemo(() => {
    const items = []
    if (filters.status !== 'todos') items.push({ key: 'status', label: `status: ${filters.status}` })
    if (filters.operadora !== 'todas') items.push({ key: 'operadora', label: `operadora: ${filters.operadora}` })
    if (currentUser.tipo_usuario === 'gestor' && filters.analista !== 'todos') {
      const analistaNome = users.find(u => String(u.id) === String(filters.analista))?.nome || filters.analista
      items.push({ key: 'analista', label: `analista: ${analistaNome}` })
    }
    if (currentUser.tipo_usuario === 'gestor' && filters.consultor !== 'todos') {
      items.push({ key: 'consultor', label: `consultor: ${filters.consultor}` })
    }
  if (filters.q && filters.q.trim()) items.push({ key: 'q', label: `busca: "${filters.q.trim()}"` })
    return items
  }, [filters, currentUser.tipo_usuario, users])

  const clearFilter = (key) => {
    setFilters(prev => {
      if (key === 'status') return { ...prev, status: 'todos' }
      if (key === 'operadora') return { ...prev, operadora: 'todas' }
      if (key === 'analista') return { ...prev, analista: 'todos' }
      if (key === 'consultor') return { ...prev, consultor: 'todos' }
      if (key === 'q') return { ...prev, q: '' }
      return prev
    })
  }

  const consultores = useMemo(() => {
    return Array.from(new Set(proposals.map(p => p.consultor).filter(Boolean))).sort((a, b) => normalize(a).localeCompare(normalize(b)))
  }, [proposals])

  const openEditDialog = (p) => {
    setEditDialogFor(p)
    setEditForm({
      operadora: p.operadora || '',
      quantidade_vidas: String(p.quantidade_vidas ?? ''),
      valor: String(p.valor ?? ''),
      previsao_implantacao: p.previsao_implantacao ? String(p.previsao_implantacao).slice(0, 10) : '',
      consultor: p.consultor || '',
      consultor_email: p.consultor_email || '',
      criado_por: String(p.criado_por || '')
    })
  }
  const closeEditDialog = () => { setEditDialogFor(null); setEditForm({ operadora: '', quantidade_vidas: '', valor: '', previsao_implantacao: '', consultor: '', consultor_email: '', criado_por: '' }) }
  const saveEditDialog = async () => {
    if (!editDialogFor) return
    const payload = {
      operadora: editForm.operadora,
      quantidade_vidas: Number(editForm.quantidade_vidas || 0),
      valor: Number(editForm.valor || 0),
      previsao_implantacao: editForm.previsao_implantacao || null,
      consultor: editForm.consultor,
      consultor_email: editForm.consultor_email,
      criado_por: editForm.criado_por
    }
    const res = await onPatchProposal?.(editDialogFor.id, payload)
    if (res?.ok) closeEditDialog()
  }

  const parseMoneyToNumber = (masked) => {
    const digits = String(masked || '').replace(/\D/g, '')
    if (!digits) return 0
    return parseInt(digits, 10) / 100
  }

  const fetchCnpjInfo = async (cnpjRaw) => {
    const cnpj = String(cnpjRaw || '').replace(/\D/g, '')
    if (!cnpj || cnpjInfoCache[cnpj]?.loading || cnpjInfoCache[cnpj]?.fetched) return
    setCnpjInfoCache(prev => ({ ...prev, [cnpj]: { ...(prev[cnpj] || {}), loading: true } }))
    try {
      const res = await fetch('/api/validate-cnpj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj })
      })
      const data = await res.json()
      if (data?.valid && data?.data) {
        setCnpjInfoCache(prev => ({
          ...prev,
          [cnpj]: { loading: false, fetched: true, razao_social: data.data.razao_social, nome_fantasia: data.data.nome_fantasia }
        }))
      } else {
        setCnpjInfoCache(prev => ({ ...prev, [cnpj]: { loading: false, fetched: true, error: data?.error || 'Não encontrado' } }))
      }
    } catch (e) {
      setCnpjInfoCache(prev => ({ ...prev, [cnpj]: { loading: false, fetched: true, error: 'Erro ao consultar' } }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser) return
    // Seleciona email alvo conforme o papel
    const email = currentUser.tipo_usuario === 'consultor'
      ? String(proposalForm.cliente_email || '').trim()
      : String(proposalForm.consultor_email || '').trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) { toast.error(currentUser.tipo_usuario === 'consultor' ? 'Informe um email de cliente válido' : 'Informe um email de consultor válido'); return }
    if (currentUser.tipo_usuario === 'consultor' && !proposalForm.cliente_nome.trim()) {
      toast.error('Informe o nome do cliente');
      return
    }
    const valorNumber = parseMoneyToNumber(proposalForm.valor)
    if (!valorNumber || valorNumber <= 0) { toast.error('Informe um valor válido maior que zero'); return }
    const resp = await fetch('/api/validate-cnpj', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cnpj: proposalForm.cnpj }) })
    const cnpjResult = await resp.json()
    if (!cnpjResult.valid) { throw new Error(cnpjResult.error || 'CNPJ inválido') }
    if (currentUser.tipo_usuario === 'gestor') setCnpjValidationResult(cnpjResult.data)
    const forcedStatus = currentUser.tipo_usuario === 'consultor' ? 'em análise' : proposalForm.status
    const payload = {
      ...proposalForm,
      status: forcedStatus,
      valor: valorNumber,
      criado_por: currentUser.id,
    }
    // Para consultor, limpar campos de consultor (serão inferidos no backend) e garantir cliente_*
    if (currentUser.tipo_usuario === 'consultor') {
      delete payload.consultor
      delete payload.consultor_email
    } else {
      // Se não for consultor, cliente_* podem ser removidos se vierem vazios
      if (!payload.cliente_nome) delete payload.cliente_nome
      if (!payload.cliente_email) delete payload.cliente_email
    }
    await onCreateProposal({
      ...payload,
      cnpjValidationData: cnpjResult.data,
      afterSuccess: () => {
        setProposalForm({ cnpj: '', consultor: '', consultor_email: '', cliente_nome: '', cliente_email: '', operadora: '', quantidade_vidas: '', valor: '', previsao_implantacao: '', status: 'em análise' })
        setCnpjValidationResult(null)
        setIsDialogOpen(false)
      }
    })
  }

  const groupedByStatus = useMemo(() => {
    const map = {}
    for (const s of statusOptions) map[s] = []
    for (const p of filteredProposals) {
      const st = p.status || statusOptions[0] || 'em análise'
      if (!map[st]) map[st] = []
      map[st].push(p)
    }
    return map
  }, [filteredProposals, statusOptions])

  // Helpers SLA/aging
  const hoursBetween = (a,b) => { try { const ta=new Date(a).getTime(); const tb=new Date(b).getTime(); if(isNaN(ta)||isNaN(tb)) return 0; return (tb-ta)/1000/3600 } catch { return 0 } }
  const ageHours = (p) => hoursBetween(p.criado_em, new Date())

  const openDetails = async (id) => {
    const prop = proposals.find(p => p.id === id)
    setDetail(prop || null)
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      const res = await fetch(`/api/proposals/${id}`, { credentials: 'include' })
      const data = await res.json().catch(() => null)
      if (res.ok && data) setDetail(data)
    } finally { setDetailLoading(false) }
  }

  return (
    <div className="space-y-6">
      {currentUser.tipo_usuario === 'consultor' && (
        <Card className="border-amber-300/60 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Como funciona</CardTitle>
            <CardDescription>Solicite a proposta e acompanhe quando um analista assumir.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs space-y-1">
            <p><strong>1.</strong> Clique em &quot;Solicitar Proposta&quot; e preencha os dados.</p>
            <p><strong>2.</strong> O status inicial será sempre <span className="font-semibold">em análise</span>.</p>
            <p><strong>3.</strong> Um analista clica em &quot;Assumir&quot; e passa a atualizar o status.</p>
            <p><strong>4.</strong> Você vê o nome do analista no cartão quando atribuído.</p>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {currentUser.tipo_usuario === 'gestor' && 'Monitorar Propostas'}
            {currentUser.tipo_usuario === 'analista' && 'Gerenciar Propostas'}
            {currentUser.tipo_usuario === 'consultor' && 'Minhas Propostas'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentUser.tipo_usuario === 'gestor' && 'Visualize e monitore todas as propostas'}
            {currentUser.tipo_usuario === 'analista' && 'Crie, edite e gerencie suas propostas'}
            {currentUser.tipo_usuario === 'consultor' && 'Crie novas propostas e acompanhe o andamento'}
          </p>
        </div>
        {(currentUser.tipo_usuario === 'analista' || currentUser.tipo_usuario === 'consultor') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="self-start">{currentUser.tipo_usuario === 'consultor' ? (<><PlusCircle className="w-4 h-4 mr-2" />Solicitar Proposta</>) : (<><PlusCircle className="w-4 h-4 mr-2" />Nova Proposta</>)}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{currentUser.tipo_usuario === 'consultor' ? 'Solicitar Proposta' : 'Criar Proposta'}</DialogTitle>
                <DialogDescription>{currentUser.tipo_usuario === 'consultor' ? 'Preencha os dados para solicitar que um analista elabore a proposta.' : 'Preencha os dados para cadastrar uma nova proposta.'}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input
                      value={proposalForm.cnpj}
                      onChange={(e) => setProposalForm(prev => ({ ...prev, cnpj: e.target.value }))}
                      onBlur={(e) => fetchCnpjInfo(e.target.value)}
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Operadora</Label>
                    <Select value={proposalForm.operadora} onValueChange={(v) => setProposalForm(prev => ({ ...prev, operadora: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>{operadoras.map(op => (<SelectItem key={op} value={op}>{op}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade de Vidas</Label>
                    <Input type="number" value={proposalForm.quantidade_vidas} onChange={(e) => setProposalForm(prev => ({ ...prev, quantidade_vidas: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do Plano</Label>
                    <Input type="text" inputMode="decimal" value={proposalForm.valor} onChange={(e) => setProposalForm(prev => ({ ...prev, valor: formatMoneyBR(e.target.value) }))} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Previsão Implantação</Label>
                    <Input type="date" value={proposalForm.previsao_implantacao} onChange={(e) => setProposalForm(prev => ({ ...prev, previsao_implantacao: e.target.value }))} />
                  </div>
                  {currentUser.tipo_usuario !== 'consultor' && (
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={proposalForm.status} onValueChange={(v) => setProposalForm(prev => ({ ...prev, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{statusOptions.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentUser.tipo_usuario === 'consultor' ? (
                    <>
                      <div className="space-y-2">
                        <Label>Nome do Cliente</Label>
                        <Input value={proposalForm.cliente_nome} onChange={(e) => setProposalForm(prev => ({ ...prev, cliente_nome: e.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Email do Cliente</Label>
                        <Input type="email" value={proposalForm.cliente_email} onChange={(e) => setProposalForm(prev => ({ ...prev, cliente_email: e.target.value }))} required />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Consultor</Label>
                        <Input value={proposalForm.consultor} onChange={(e) => setProposalForm(prev => ({ ...prev, consultor: e.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Email do Consultor</Label>
                        <Input type="email" value={proposalForm.consultor_email} onChange={(e) => setProposalForm(prev => ({ ...prev, consultor_email: e.target.value }))} required />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Propostas (Kanban)</CardTitle>
              <CardDescription>{filteredProposals.length} de {proposals.length} proposta(s) filtradas</CardDescription>
              {slaSummary && (
                <p className="text-xs text-muted-foreground mt-1">SLA médio para assumir: {slaSummary.sla_medio_horas.toFixed(2)}h • Aguardando analista: {slaSummary.aguardando_analista}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => exportCsv(filteredProposals)}>Exportar CSV</Button>
            </div>
          </div>
          {activeFilters.length > 0 && (
            <div className="text-xs mt-1 flex items-center flex-wrap gap-2">
              {activeFilters.map(f => (
                <Badge key={f.key} variant="secondary" className="gap-1">
                  <span>{f.label}</span>
                  <button type="button" aria-label={`Remover filtro ${f.key}`} className="ml-1 opacity-80 hover:opacity-100" onClick={() => clearFilter(f.key)}>
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
              <Input placeholder="CNPJ, consultor ou código" value={filters.q} onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {statusOptions.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operadora</Label>
              <Select value={filters.operadora} onValueChange={(v) => setFilters(prev => ({ ...prev, operadora: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {operadoras.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {currentUser.tipo_usuario === 'gestor' && (
              <div className="space-y-2">
                <Label>Analista</Label>
                <Select value={filters.analista} onValueChange={(v) => setFilters(prev => ({ ...prev, analista: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {users.map(u => (<SelectItem key={u.id} value={String(u.id)}>{u.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {currentUser.tipo_usuario === 'gestor' && (
              <div className="space-y-2">
                <Label>Consultor</Label>
                <Select value={filters.consultor} onValueChange={(v) => setFilters(prev => ({ ...prev, consultor: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {consultores.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2 flex flex-col justify-end">
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setVidasSortAsc(v => !v)} title={vidasSortAsc ? 'Ordenar vidas decrescente' : 'Ordenar vidas crescente'}>
                  <ArrowUpDown className="w-4 h-4 mr-1" />{vidasSortAsc ? 'Vidas ↑' : 'Vidas ↓'}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setFilters(defaultFilters)}>Limpar</Button>
              </div>
              {currentUser.tipo_usuario === 'analista' && (
                <label className="flex items-center gap-2 text-[11px] pt-1 select-none cursor-pointer">
                  <input type="checkbox" className="h-3 w-3" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} /> Somente livres
                </label>
              )}
            </div>
          </div>

          {/* Kanban */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {statusOptions.map(status => (
              <div key={status} className="border rounded-md bg-card flex flex-col max-h-[560px]">
                <div className="p-2 border-b flex items-center gap-2 text-sm font-medium capitalize">
                  <span>{status}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{groupedByStatus[status]?.length || 0}</span>
                </div>
                <div className="p-2 space-y-2 overflow-y-auto">
                  {groupedByStatus[status]?.map(p => {
                    const canEdit = (
                      currentUser.tipo_usuario !== 'consultor' && (
                        currentUser.tipo_usuario === 'gestor' ||
                        String(p.criado_por) === String(currentUser.id)
                      )
                    )
                    const busy = !!updatingStatus[p.id]
                    const isWaiting = !p.atendido_por
                    const isLate = isWaiting && ageHours(p) > SLA_THRESHOLD_HOURS
                    return (
                      <div key={p.id} className={`rounded p-2 bg-background text-xs space-y-1 border relative group ${isWaiting ? (isLate ? 'border-red-400 shadow-[0_0_0_1px_rgba(248,113,113,0.45)]' : 'border-amber-300/70 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]') : p.status === 'implantado' ? 'border-green-500 shadow-[0_0_0_1px_rgba(34,197,94,0.35)]' : 'border-border'}`}>
                        <div className="font-medium truncate flex items-center gap-1" title={p.consultor}>
                          <span className="font-mono text-[10px] px-1 py-0.5 bg-muted rounded">{p.codigo || '—'}</span>
                          <span className="truncate capitalize">{p.operadora}</span>
                          {isWaiting && (
                            <span className={`ml-auto inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded ${isLate ? 'bg-red-600' : 'bg-amber-500'} text-white font-semibold tracking-wide uppercase`}>
                              {isLate ? 'SLA!' : 'Livre'}
                            </span>
                          )}
                          {p.atendido_por && p.status === 'implantado' && (
                            <span className="ml-auto inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-green-600 text-white font-semibold tracking-wide uppercase">
                              Implantado
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between gap-2 flex-wrap text-[11px]">
                          <span className="font-mono" title={p.cnpj}>{formatCNPJ(p.cnpj)}</span>
                          <span>{p.quantidade_vidas} vidas</span>
                          <span>{formatCurrency(p.valor)}</span>
                        </div>
                        {isWaiting && (
                          <div className="text-[10px] text-muted-foreground">Aguardando há {ageHours(p).toFixed(1)}h</div>
                        )}
                        {(p.cliente_nome || p.cliente_email) && (
                          <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                            <span className="truncate max-w-[140px]" title={p.cliente_nome}>{p.cliente_nome}</span>
                            {p.cliente_email && <span className="truncate max-w-[140px]" title={p.cliente_email}>({p.cliente_email})</span>}
                          </div>
                        )}
                        {/* Tags placeholder (carregadas no modal) */}
                        <div className="flex gap-1 flex-wrap items-center pt-1">
                          <button type="button" onClick={() => openDetails(p.id)} className="px-2 py-0.5 text-[11px] rounded bg-secondary text-secondary-foreground hover:brightness-105">Ver detalhes</button>
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" disabled={busy} className="px-2 py-0.5 text-[11px] rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50">{busy ? '...' : 'Status'}</button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-44">
                                <DropdownMenuLabel className="text-[11px]">Alterar status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {statusOptions.filter(s => s !== p.status).map(next => (
                                  <DropdownMenuItem key={next} className="text-[12px] capitalize" disabled={busy} onClick={async () => {
                                    try {
                                      setUpdatingStatus(prev => ({ ...prev, [p.id]: true }))
                                      await onUpdateProposalStatus(p.id, next, p)
                                    } finally { setUpdatingStatus(prev => ({ ...prev, [p.id]: false })) }
                                  }}>{next}</DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {currentUser.tipo_usuario === 'gestor' && (
                            <button type="button" onClick={() => openEditDialog(p)} className="px-2 py-0.5 text-[11px] rounded border bg-background hover:bg-muted">Editar</button>
                          )}
                          {/* Claim para analista: aparece se não houver atendido_por */}
                          {currentUser.tipo_usuario === 'analista' && !p.atendido_por && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  setUpdatingStatus(prev => ({ ...prev, [p.id]: true }))
                                  await onPatchProposal?.(p.id, { claim: true })
                                } finally { setUpdatingStatus(prev => ({ ...prev, [p.id]: false })) }
                              }}
                              className="px-2 py-0.5 text-[11px] rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                              disabled={!!updatingStatus[p.id]}
                            >
                              Assumir
                            </button>
                          )}
                          {p.atendido_por && (
                            <span className="text-[10px] text-muted-foreground">
                              {`Atendido por: ${users.find(u => u.id === p.atendido_por)?.nome || '—'}`}
                            </span>
                          )}
                        </div>
                        {currentUser.tipo_usuario === 'gestor' && (
                          <div className="text-[10px] text-muted-foreground">Analista: {(users.find(u => u.id === p.criado_por)?.nome) || '-'}</div>
                        )}
                      </div>
                    )
                  })}
                  {groupedByStatus[status]?.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-4">Sem propostas</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {auditOpenFor && (<AuditDrawer id={auditOpenFor} onClose={() => setAuditOpenFor(null)} />)}

          {/* Dialog edição gestor */}
          <Dialog open={!!editDialogFor} onOpenChange={(v) => { if (!v) closeEditDialog() }}>
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
                      <Select value={editForm.operadora} onValueChange={(v) => setEditForm(prev => ({ ...prev, operadora: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{operadoras.map(op => (<SelectItem key={op} value={op}>{op}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantidade de Vidas</Label>
                      <Input type="number" value={editForm.quantidade_vidas} onChange={(e) => setEditForm(prev => ({ ...prev, quantidade_vidas: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor do Plano</Label>
                      <Input type="number" step="0.01" value={editForm.valor} onChange={(e) => setEditForm(prev => ({ ...prev, valor: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Previsão de Implantação</Label>
                      <Input type="date" value={editForm.previsao_implantacao} onChange={(e) => setEditForm(prev => ({ ...prev, previsao_implantacao: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Consultor</Label>
                      <Input value={editForm.consultor} onChange={(e) => setEditForm(prev => ({ ...prev, consultor: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email do Consultor</Label>
                      <Input type="email" value={editForm.consultor_email} onChange={(e) => setEditForm(prev => ({ ...prev, consultor_email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Analista</Label>
                    <Select value={editForm.criado_por} onValueChange={(v) => setEditForm(prev => ({ ...prev, criado_por: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{users.map(u => (<SelectItem key={u.id} value={String(u.id)}>{u.nome}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeEditDialog}>Cancelar</Button>
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
              <h3 className="font-semibold text-lg">Detalhes da Proposta {detail?.codigo && <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{detail.codigo}</span>}</h3>
              <button className="ml-auto text-sm text-muted-foreground hover:text-foreground" onClick={() => setDetailOpen(false)}>Fechar</button>
            </div>
            {detailLoading && <p className="text-sm">Carregando...</p>}
            {!detailLoading && detail && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">CNPJ:</span> {formatCNPJ(detail.cnpj)}</div>
                  <div><span className="font-medium">Operadora:</span> {detail.operadora}</div>
                  <div><span className="font-medium">Consultor:</span> {detail.consultor}</div>
                  <div><span className="font-medium">Email Consultor:</span> {detail.consultor_email || '—'}</div>
                    <div><span className="font-medium">Cliente:</span> {detail.cliente_nome || '—'}</div>
                    <div><span className="font-medium">Email Cliente:</span> {detail.cliente_email || '—'}</div>
                    <div><span className="font-medium">Analista Criador:</span> {(users.find(u => u.id === detail.criado_por)?.nome) || detail.analista_nome || '—'}</div>
                    <div><span className="font-medium">Responsável Atual:</span> {detail.analista_responsavel_nome || detail.atendido_por_nome || (detail.atendido_por && (users.find(u => u.id === detail.atendido_por)?.nome)) || (users.find(u => u.id === detail.criado_por)?.nome) || '—'}</div>
                    <div><span className="font-medium">Assumido em:</span> {detail.atendido_em ? new Date(detail.atendido_em).toLocaleString('pt-BR') : '—'}</div>
                  <div><span className="font-medium">Vidas:</span> {detail.quantidade_vidas}</div>
                  <div><span className="font-medium">Valor:</span> {formatCurrency(detail.valor)}</div>
                  <div><span className="font-medium">Status:</span> {detail.status}</div>
                  <div className="col-span-2"><span className="font-medium">Previsão Implantação:</span> {detail.previsao_implantacao ? new Date(detail.previsao_implantacao).toLocaleDateString('pt-BR') : '—'}</div>
                  <div className="col-span-2">
                    <span className="font-medium">Observações do Cliente:</span>
                    <p className="text-xs mt-1 whitespace-pre-wrap border rounded p-2 bg-muted/30 min-h-[40px]">{detail.observacoes_cliente || '—'}</p>
                  </div>
                </div>
                {/* Tags & Notas */}
                <ProposalTagsNotes
                  proposalId={detail.id}
                  canManage={currentUser.tipo_usuario !== 'consultor'}
                />
                {currentUser.tipo_usuario === 'gestor' && (
                  <div>
                    <Button size="sm" variant="outline" onClick={() => { setAuditOpenFor(detail.id); setDetailOpen(false) }}>Ver Histórico</Button>
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
  useEffect(() => { let mounted=true; (async()=>{ try {
      const [rt, rn] = await Promise.all([
        fetch(`/api/proposals/tags?proposta_id=${proposalId}`, {credentials:'include'}),
        fetch(`/api/proposals/notes?proposta_id=${proposalId}`, {credentials:'include'})
      ])
      if (rt.ok) { const d = await rt.json(); if(mounted) setTags(Array.isArray(d)?d:[]) }
      if (rn.ok) { const d2 = await rn.json(); if(mounted) setNotes(Array.isArray(d2)?d2:[]) }
    } finally { if(mounted) setLoading(false) } })(); return ()=>{mounted=false} }, [proposalId])

  const addTag = async () => {
    if(!newTag.trim()) return
    const res = await fetch('/api/proposals/tags', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ proposta_id: proposalId, tag: newTag }) })
    if(res.ok){ setNewTag(''); const d = await fetch(`/api/proposals/tags?proposta_id=${proposalId}`, {credentials:'include'}); if(d.ok) setTags(await d.json()) }
  }
  const removeTag = async (tag) => {
    const res = await fetch(`/api/proposals/tags?proposta_id=${proposalId}&tag=${encodeURIComponent(tag)}`, { method:'DELETE', credentials:'include' })
    if(res.ok){ setTags(tags.filter(t=>t.tag!==tag)) }
  }
  const addNote = async () => {
    if(!newNote.trim()) return
    const res = await fetch('/api/proposals/notes', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ proposta_id: proposalId, nota: newNote }) })
    if(res.ok){ setNewNote(''); const d = await fetch(`/api/proposals/notes?proposta_id=${proposalId}`, {credentials:'include'}); if(d.ok) setNotes(await d.json()) }
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div>
        <h4 className="font-semibold text-sm mb-2">Tags</h4>
        {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}
        {!loading && (
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map(t => (
              <span key={t.tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] px-2 py-1 rounded">
                {t.tag}
                {canManage && <button onClick={()=>removeTag(t.tag)} className="hover:text-destructive" title="Remover">×</button>}
              </span>
            ))}
            {tags.length===0 && <span className="text-xs text-muted-foreground">Sem tags</span>}
          </div>
        )}
        {canManage && (
          <div className="flex gap-2">
            <Input value={newTag} onChange={e=>setNewTag(e.target.value)} placeholder="nova tag" className="h-8 text-xs" />
            <Button type="button" size="sm" onClick={addTag}>Adicionar</Button>
          </div>
        )}
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-2">Notas Internas</h4>
        {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}
        {!loading && (
          <div className="space-y-2 max-h-48 overflow-auto pr-1">
            {notes.map(n => (
              <div key={n.id} className="p-2 rounded border text-xs bg-muted/30">
                <div className="text-[10px] text-muted-foreground mb-1">{new Date(n.criado_em).toLocaleString('pt-BR')}</div>
                <div className="whitespace-pre-wrap break-words">{n.nota}</div>
              </div>
            ))}
            {notes.length===0 && <span className="text-xs text-muted-foreground">Sem notas</span>}
          </div>
        )}
        {canManage && (
          <div className="flex gap-2 pt-2">
            <Input value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Nova nota" className="h-8 text-xs" />
            <Button type="button" size="sm" onClick={addNote}>Salvar</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// CSV Export
function exportCsv(rows){
  if(!rows || rows.length===0){ toast?.info?.('Nada para exportar') ; return }
  const headers = ['codigo','cnpj','operadora','status','consultor','consultor_email','cliente_nome','cliente_email','quantidade_vidas','valor','criado_em','atendido_em']
  const escape = (v)=>`"${String(v??'').replace(/"/g,'""')}"`
  const csv = [headers.join(';'), ...rows.map(r => headers.map(h=>escape(r[h])).join(';'))].join('\n')
  try {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `propostas_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) { console.error('CSV export error', e) }
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
      } finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [id])
  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-card border w-full sm:max-w-2xl max-h-[80vh] overflow-auto rounded-t-xl sm:rounded-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">Histórico de alterações</h3>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
        <div className="p-4 space-y-3 text-sm">
          {loading ? 'Carregando…' : (
            items.length === 0 ? 'Sem registros' : items.map((it) => (
              <div key={it.id} className="p-3 rounded border">
                <div className="text-xs text-muted-foreground">{new Date(it.criado_em).toLocaleString('pt-BR')}</div>
                <pre className="text-xs whitespace-pre-wrap mt-1">{JSON.stringify(it.changes, null, 2)}</pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
