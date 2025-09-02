"use client"

import { useEffect, useMemo, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PlusCircle, X, ArrowUpDown, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { formatCurrency, formatCNPJ } from '@/lib/utils'
import { STATUS_COLORS } from '@/lib/constants'
import ProposalsTimeline from '@/components/timeline/ProposalsTimelineComponent'

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
  const maskCNPJ = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '').slice(0,14)
    let out = digits
    if (digits.length > 2) out = digits.slice(0,2) + '.' + digits.slice(2)
    if (digits.length > 5) out = out.slice(0,6) + '.' + out.slice(6)
    if (digits.length > 8) out = out.slice(0,10) + '/' + out.slice(10)
    if (digits.length > 12) out = out.slice(0,15) + '-' + out.slice(15)
    return out
  }
  const moneyDigits = (value) => String(value || '').replace(/\D/g, '').slice(0, 15) // até 13 inteiros + 2 decimais
  const formatMoneyBR = (value) => {
    const digits = moneyDigits(value)
    if (!digits) return ''
    const number = parseInt(digits, 10) / 100
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number)
  }
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
    status: 'recepcionado'
  })
  // Validação / cache CNPJ
  // Resultado detalhado (somente gestor exibe após criação) - removido do layout por enquanto
  const [_cnpjValidationResult, setCnpjValidationResult] = useState(null)
  const [cnpjInfoCache, setCnpjInfoCache] = useState({}) // { [cnpj]: { loading, fetched, razao_social, nome_fantasia, error } }
  // Flag derivada para saber se o botão deve ficar desabilitado (validação em andamento)
  const isCnpjValidating = (() => {
    const digits = String(proposalForm.cnpj || '').replace(/\D/g, '')
    if (digits.length !== 14) return false
    return !!cnpjInfoCache[digits]?.loading
  })()
  // Filtros
  const defaultFilters = { q: '', status: 'todos', operadora: 'todas', analista: 'todos', consultor: 'todos' }
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

  // (formatMoneyBR redefinido acima com limites)

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
      // Busca
      if (qn) {
        const cnpjDigits = String(p.cnpj || '').replace(/\D/g, '')
        const haystack = [cnpjDigits, p.consultor, p.codigo, p.operadora, p.cliente_nome].filter(Boolean).map(normalize)
        if (!haystack.some(h => h.includes(qn))) return false
      }
      if (filters.status !== 'todos' && p.status !== filters.status) return false
      if (filters.operadora !== 'todas' && p.operadora !== filters.operadora) return false
      if (currentUser.tipo_usuario === 'gestor' && filters.analista !== 'todos' && String(p.criado_por) !== String(filters.analista)) return false
      if (currentUser.tipo_usuario === 'gestor' && filters.consultor !== 'todos' && p.consultor !== filters.consultor) return false
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
  }, [proposalsMerged, filters, currentUser.tipo_usuario, vidasSortAsc])

  // Alertas em tempo real de SLA estourado (analista/gestor)
  useEffect(() => {
    if (!filteredProposals.length) return
    if (currentUser.tipo_usuario === 'consultor') return
    const now = Date.now()
    // Persistência leve para não repetir alertas em page reload: sessionStorage
    let persisted = {}
    try { persisted = JSON.parse(sessionStorage.getItem('crm:proposalAlerts')||'{}') } catch {}
    let changed = false
    filteredProposals.forEach(p => {
      if (p.atendido_por) return
      const created = new Date(p.criado_em).getTime()
      if (isNaN(created)) return
      const hours = (now - created)/1000/3600
      // SLA básico
      if (hours >= SLA_THRESHOLD_HOURS && !slaAlertedRef.current.has(p.id)) {
        slaAlertedRef.current.add(p.id)
        toast.error(`SLA estourado: proposta ${p.codigo || p.id.slice(0,8)} aguardando há ${hours.toFixed(1)}h`)
        persisted[p.id] = { lastAlert: Date.now(), type: 'sla' }
        changed = true
      }
      // Aging > 24h informativo
      if (hours >= AGE_ALERT_HOURS && !slaAlertedRef.current.has('age:'+p.id)) {
        slaAlertedRef.current.add('age:'+p.id)
        toast.info(`Proposta ${p.codigo || p.id.slice(0,8)} parada há ${Math.floor(hours)}h`)        
        persisted[p.id] = { lastAlert: Date.now(), type: 'age24' }
        changed = true
      }
      // Aging forte > 48h
      if (hours >= AGE_STRONG_ALERT_HOURS && !slaAlertedRef.current.has('ageStrong:'+p.id)) {
        slaAlertedRef.current.add('ageStrong:'+p.id)
        toast.error(`Proposta ${p.codigo || p.id.slice(0,8)} parada há ${Math.floor(hours)}h (atenção)`)        
        persisted[p.id] = { lastAlert: Date.now(), type: 'age48' }
        changed = true
      }
    })
    if (changed) {
      try { sessionStorage.setItem('crm:proposalAlerts', JSON.stringify(persisted)) } catch {}
  }
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
    if (!cnpj) return
    // Se já temos em cache (fetched) apenas tentar preencher o nome se estiver vazio e sair
    const cached = cnpjInfoCache[cnpj]
    if (cached?.fetched && !cached?.loading) {
      if ((cached.nome_fantasia || cached.razao_social) && currentUser?.tipo_usuario === 'consultor') {
        const fantasia = cached.nome_fantasia || cached.razao_social || ''
        setProposalForm(prev => prev.cliente_nome?.trim() ? prev : ({ ...prev, cliente_nome: fantasia }))
      }
      // Evita nova chamada de rede
      return
    }
    if (cached?.loading) return
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
        // Auto-preenche nome do cliente para consultor se ainda vazio
        if (currentUser?.tipo_usuario === 'consultor') {
          const fantasia = data.data.nome_fantasia || data.data.razao_social || ''
          if (fantasia) setProposalForm(prev => prev.cliente_nome?.trim() ? prev : ({ ...prev, cliente_nome: fantasia }))
        }
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
      toast.error('Valide o CNPJ para carregar o Nome do Cliente');
      return
    }
  const valorNumber = parseMoneyToNumber(proposalForm.valor)
  if (!valorNumber || valorNumber <= 0) { toast.error('Informe um valor válido maior que zero'); return }
    const cnpjDigits = String(proposalForm.cnpj || '').replace(/\D/g,'')
    if (cnpjDigits.length !== 14) { toast.error('CNPJ deve ter 14 dígitos'); return }
    let cnpjResult
    try {
      const resp = await fetch('/api/validate-cnpj', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cnpj: cnpjDigits }) })
      cnpjResult = await resp.json()
    } catch (err) {
      toast.error('Erro ao validar CNPJ');
      return
    }
    if (!cnpjResult?.valid) { toast.error(cnpjResult?.error || 'CNPJ inválido'); return }
    if (currentUser.tipo_usuario === 'gestor') setCnpjValidationResult(cnpjResult.data)
    const forcedStatus = currentUser.tipo_usuario === 'consultor' ? 'recepcionado' : proposalForm.status
    const payload = {
      ...proposalForm,
      status: forcedStatus,
      valor: valorNumber,
      criado_por: currentUser.id,
    }
    // Garante que o backend receba apenas dígitos do CNPJ
    payload.cnpj = cnpjDigits
    // Para consultor, limpar campos de consultor (serão inferidos no backend) e garantir cliente_*
    if (currentUser.tipo_usuario === 'consultor') {
      delete payload.consultor
      delete payload.consultor_email
    } else {
      // Se não for consultor, cliente_* podem ser removidos se vierem vazios
      if (!payload.cliente_nome) delete payload.cliente_nome
      if (!payload.cliente_email) delete payload.cliente_email
      // Para analistas, também limpar campos de consultor se vazios
      if (!payload.consultor || !payload.consultor.trim()) delete payload.consultor
      if (!payload.consultor_email || !payload.consultor_email.trim()) delete payload.consultor_email
    }
    await onCreateProposal({
      ...payload,
      cnpjValidationData: cnpjResult.data,
      afterSuccess: () => {
        setProposalForm({ cnpj: '', consultor: '', consultor_email: '', cliente_nome: '', cliente_email: '', operadora: '', quantidade_vidas: '', valor: '', previsao_implantacao: '', status: 'recepcionado' })
        setCnpjValidationResult(null)
        setIsDialogOpen(false)
      }
    })
  }

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
            <p><strong>2.</strong> O status inicial será sempre <span className="font-semibold">recepcionado</span>.</p>
            <p><strong>3.</strong> Um analista clica em &quot;Assumir&quot; e passa a atualizar o status.</p>
            <p><strong>4.</strong> Você vê o nome do analista no cartão quando atribuído.</p>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {currentUser.tipo_usuario === 'gestor' && 'Monitorar Propostas'}
            {['analista_implantacao', 'analista_movimentacao'].includes(currentUser.tipo_usuario) && 'Gerenciar Propostas'}
            {currentUser.tipo_usuario === 'consultor' && 'Minhas Propostas'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentUser.tipo_usuario === 'gestor' && 'Visualize e monitore todas as propostas'}
            {['analista_implantacao', 'analista_movimentacao'].includes(currentUser.tipo_usuario) && 'Crie, edite e gerencie suas propostas'}
            {currentUser.tipo_usuario === 'consultor' && 'Crie novas propostas e acompanhe o andamento'}
          </p>
        </div>
        {(['analista_implantacao', 'analista_movimentacao'].includes(currentUser.tipo_usuario) || currentUser.tipo_usuario === 'consultor') && (
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
                      maxLength={18}
                      inputMode="numeric"
                      onChange={(e) => {
                        const masked = maskCNPJ(e.target.value)
                        setProposalForm(prev => ({ ...prev, cnpj: masked }))
                        const digits = masked.replace(/\D/g,'')
                        if (digits.length === 14) fetchCnpjInfo(masked)
                      }}
                      onBlur={(e) => fetchCnpjInfo(e.target.value)}
                      placeholder="00.000.000/0000-00"
                      required
                    />
                    {(() => {
                      const digits = String(proposalForm.cnpj || '').replace(/\D/g, '')
                      if (digits.length !== 14) return null
                      const info = cnpjInfoCache[digits]
                      if (!info) return null
                      if (info.loading) return (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Validando CNPJ…</span>
                        </div>
                      )
                      if (info.error) return (
                        <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{info.error}</span>
                        </div>
                      )
                      const nome = info?.nome_fantasia || info?.razao_social
                      if (nome) return (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="truncate max-w-[220px]" title={nome}>{nome}</span>
                        </div>
                      )
                      return null
                    })()}
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
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={proposalForm.valor}
                      onChange={(e) => setProposalForm(prev => ({ ...prev, valor: formatMoneyBR(e.target.value) }))}
                      placeholder="0,00"
                      required
                    />
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
                        <Input value={proposalForm.cliente_nome} readOnly disabled placeholder="Preencha o CNPJ para carregar" />
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
                  <Button type="submit" disabled={isCnpjValidating}>
                    {isCnpjValidating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar
                  </Button>
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
            </div>
          </div>

          {/* Kanban horizontal */}
          <div className="overflow-x-auto pb-2 -m-1 pl-1" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex gap-4 min-h-[300px] w-max pr-4">
            {statusOptions.map(status => {
              const statusColors = STATUS_COLORS[status] || { bg: '#f6f6f6', text: '#333333', border: '#e2e2e2' }
              return (
              <div key={status} className="border rounded-md bg-card flex flex-col max-h-[560px] shadow-sm overflow-hidden min-w-[270px] w-[270px]">
                <div 
                  className="p-2 border-b flex items-center gap-2 text-sm font-medium capitalize sticky top-0 z-10 after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border"
                  style={{
                    backgroundColor: statusColors.bg,
                    color: statusColors.text,
                    borderColor: statusColors.border
                  }}
                >
                  <span>{status}</span>
                  <span className="ml-auto text-xs tabular-nums opacity-70">{groupedByStatus[status]?.length || 0}</span>
                </div>
                <div className="p-2 space-y-2 overflow-y-auto custom-scrollbar">
                  {(!groupedByStatus[status] || groupedByStatus[status].length === 0) && (
                    <div className="text-[11px] text-muted-foreground italic px-2 py-4 border border-dashed rounded bg-background/40">
                      Nenhuma proposta
                    </div>
                  )}
                  {groupedByStatus[status]?.map((p) => {
                    const isHandler = String(p.atendido_por) === String(currentUser.id)
                    const canEdit = (
                      currentUser.tipo_usuario === 'gestor' || (['analista_implantacao', 'analista_movimentacao'].includes(currentUser.tipo_usuario) && isHandler)
                    )
                    const busy = !!updatingStatus[p.id]
                    const isWaiting = !p.atendido_por
                    const isLate = isWaiting && ageHours(p) > SLA_THRESHOLD_HOURS
                    const ageClass = p.horas_em_analise >= 48 ? 'before:bg-gradient-to-b before:from-red-500 before:to-red-700' : p.horas_em_analise >= 24 ? 'before:bg-gradient-to-b before:from-amber-400 before:to-amber-600' : 'before:bg-gradient-to-b before:from-transparent before:to-transparent'
                    const statusColors = STATUS_COLORS[status] || { bg: '#f6f6f6', text: '#333333', border: '#e2e2e2' }
                    return (
                      <div 
                        key={p.id} 
                        className={`rounded p-2 backdrop-blur text-xs space-y-1 border relative group transition-colors hover:border-primary/60 hover:shadow-md ${isWaiting ? (isLate ? 'ring-2 ring-red-400' : 'ring-1 ring-amber-300') : ''} before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l before:transition-all before:duration-300 ${ageClass}`}
                        style={{
                          backgroundColor: statusColors.bg,
                          color: statusColors.text,
                          borderColor: statusColors.border
                        }}
                      >
                        {/* zebra effect via idx */}
                        <div className="absolute inset-0 pointer-events-none rounded opacity-0 group-hover:opacity-5 transition-opacity bg-primary" />
                        <div className="font-medium truncate flex items-center gap-1" title={p.consultor}>
                          <span 
                            className="font-mono text-[10px] px-1 py-0.5 rounded flex items-center gap-1"
                            style={{
                              backgroundColor: statusColors.bg,
                              color: '#000000 !important',
                              fontWeight: 'bold',
                              border: `1px solid ${statusColors.border}`
                            }}
                          >
                            {p.codigo || '—'}
                            {typeof p.horas_em_analise === 'number' && (
                              <span
                                title={`Horas em análise: ${p.horas_em_analise}`}
                                className={
                                  `inline-flex items-center gap-0.5 rounded px-1 text-[9px] font-semibold border `+
                                  (p.horas_em_analise >= AGE_STRONG_ALERT_HOURS ? 'bg-red-600 text-white border-red-700' :
                                   p.horas_em_analise >= AGE_ALERT_HOURS ? 'bg-amber-500 text-black border-amber-600' :
                                   'bg-gray-200 text-gray-700 border-gray-300')
                                }
                              >
                                <Clock className="w-3 h-3" />
                                {p.horas_em_analise >= 48 ? `${Math.floor(p.horas_em_analise/24)}d` : `${p.horas_em_analise}h`}
                              </span>
                            )}
                          </span>
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
                        {/* Ações */}
                        <div className="flex gap-1 flex-wrap items-center pt-1">
                          <button type="button" onClick={() => openDetails(p.id)} className="px-2 py-0.5 text-[11px] rounded bg-secondary text-secondary-foreground hover:brightness-105">Ver detalhes</button>
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" disabled={busy} className="px-2 py-0.5 text-[11px] rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50">{busy ? '...' : 'Alterar Status'}</button>
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
                          {['analista_implantacao', 'analista_movimentacao'].includes(currentUser.tipo_usuario) && !p.atendido_por && (
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
                          {(() => {
                            let handlerId = p.atendido_por
                            if (!handlerId && p.status === 'implantado') {
                              const creatorIsAnalyst = users.some(u => u.id === p.criado_por && ['analista_implantacao', 'analista_movimentacao'].includes(u.tipo_usuario))
                              if (creatorIsAnalyst) handlerId = p.criado_por
                            }
                            const nome = handlerId ? (users.find(u => u.id === handlerId)?.nome || '—') : '—'
                            return (
                              <span className="text-[10px] text-muted-foreground">
                                {`Atendido por: ${nome}`}
                              </span>
                            )
                          })()}
                        </div>
                        {currentUser.tipo_usuario === 'gestor' && (
                          <div className="text-[10px] text-muted-foreground">Analista: {(users.find(u => u.id === p.criado_por)?.nome) || '-'}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              )
            })}
            </div>
          </div>

          {/* Linha do Tempo - Para Analistas de Implantação */}
          {currentUser.tipo_usuario === 'analista_implantacao' && (
            <div className="mt-6">
              <ProposalsTimeline 
                proposals={filteredProposals} 
                currentUser={currentUser}
              />
            </div>
          )}

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
                      <Label>Início de Vigência</Label>
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
              <h3 className="font-semibold text-lg">
                Detalhes da Proposta {detail?.codigo && (
                  <span 
                    className="font-mono text-xs px-1 py-0.5 rounded ml-2"
                    style={{
                      backgroundColor: (STATUS_COLORS[detail.status] || { bg: '#f6f6f6' }).bg,
                      color: '#000000 !important',
                      fontWeight: 'bold',
                      border: `1px solid ${(STATUS_COLORS[detail.status] || { border: '#e2e2e2' }).border}`
                    }}
                  >
                    {detail.codigo}
                  </span>
                )}
              </h3>
              <button className="ml-auto text-sm text-muted-foreground hover:text-foreground" onClick={() => setDetailOpen(false)}>Fechar</button>
            </div>
            {detailLoading && <p className="text-sm">Carregando...</p>}
            {!detailLoading && detail && (
              <div className="space-y-6 text-sm">
                {/* Blocos superiores: Consultor / Analista */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-md border bg-muted/20 space-y-2">
                    <h4 className="font-semibold text-xs tracking-wide uppercase text-muted-foreground">Consultor</h4>
                    <div><span className="font-medium">Nome:</span> {detail.consultor || '—'}</div>
                    <div><span className="font-medium">Email:</span> {detail.consultor_email || '—'}</div>
                    <div><span className="font-medium">Cliente:</span> {detail.cliente_nome || '—'}</div>
                    <div><span className="font-medium">Email Cliente:</span> {detail.cliente_email || '—'}</div>
                  </div>
                  <div className="p-4 rounded-md border bg-muted/20 space-y-2">
                    <h4 className="font-semibold text-xs tracking-wide uppercase text-muted-foreground">Analista</h4>
                    {(() => {
                      const nomeResp = detail.atendido_por ? (users.find(u => u.id === detail.atendido_por)?.nome || '—') : '—'
                      return (
                        <>
                          <div><span className="font-medium">Responsável Atual:</span> {nomeResp}</div>
                          <div><span className="font-medium">Assumido em:</span> {detail.atendido_em ? new Date(detail.atendido_em).toLocaleString('pt-BR') : '—'}</div>
                          <div><span className="font-medium">Status:</span> {detail.status}</div>
                          <div><span className="font-medium">Previsão Implantação:</span> {detail.previsao_implantacao ? new Date(detail.previsao_implantacao).toLocaleDateString('pt-BR') : '—'}</div>
                        </>
                      )
                    })()}
                  </div>
                </div>
                {/* Dados gerais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-md border bg-background/50 space-y-1">
                    <h4 className="font-semibold text-xs tracking-wide uppercase text-muted-foreground">Dados da Proposta</h4>
                    <div><span className="font-medium">CNPJ:</span> {formatCNPJ(detail.cnpj)}</div>
                    <div><span className="font-medium">Operadora:</span> {detail.operadora}</div>
                    <div><span className="font-medium">Vidas:</span> {detail.quantidade_vidas}</div>
                    <div><span className="font-medium">Valor:</span> {formatCurrency(detail.valor)}</div>
                  </div>
                  <div className="p-4 rounded-md border bg-background/50 space-y-2">
                    <h4 className="font-semibold text-xs tracking-wide uppercase text-muted-foreground">Observações Cliente</h4>
                    <p className="text-xs whitespace-pre-wrap border rounded p-2 bg-muted/30 min-h-[60px]">{detail.observacoes_cliente || '—'}</p>
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
