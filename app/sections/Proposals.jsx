"use client"

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { PlusCircle, X, RefreshCw, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatCNPJ, getStatusBadgeClasses } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function ProposalsSection(props) {
  const { currentUser } = props
  const isConsultor = currentUser?.tipo_usuario === 'consultor'
  if (isConsultor) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>Consultores não têm acesso à tela de Propostas.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }
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
  isLoading,
  users = [],
  userGoals = [],
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [cnpjValidationResult, setCnpjValidationResult] = useState(null)
  const [cnpjInfoCache, setCnpjInfoCache] = useState({}) // { [cnpj]: { loading, razao_social, nome_fantasia, error } }
  const [updatingStatus, setUpdatingStatus] = useState({}) // { [proposalId]: boolean }
  const [rowEdits, setRowEdits] = useState({})
  const [auditOpenFor, setAuditOpenFor] = useState(null)
  const defaultFilters = { q: '', status: 'todos', operadora: 'todas', analista: 'todos', consultor: 'todos' }
  const [filters, setFilters] = useState(defaultFilters)
  const [vidasSortAsc, setVidasSortAsc] = useState(true)
  const [proposalForm, setProposalForm] = useState({
    cnpj: '',
    consultor: '',
    consultor_email: '',
    operadora: '',
    quantidade_vidas: '',
    valor: '',
    previsao_implantacao: '',
    status: 'em análise'
  })

  const formatMoneyBR = (value) => {
    const digits = String(value || '').replace(/\D/g, '')
    if (!digits) return ''
    const number = parseInt(digits, 10) / 100
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number)
  }

  const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

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

  const filteredProposals = useMemo(() => {
    const qn = normalize(filters.q)
    const list = proposals.filter((p) => {
      // texto: cnpj (formatado ou dígitos) ou consultor
      const cnpjDigits = String(p.cnpj || '').replace(/\D/g, '')
      const cnpjFmt = formatCNPJ(p.cnpj)
      const consultor = normalize(p.consultor)
      const matchText = !qn || normalize(cnpjFmt).includes(qn) || cnpjDigits.includes(filters.q.replace(/\D/g, '')) || consultor.includes(qn)

  const matchStatus = filters.status === 'todos' || normalize(p.status) === normalize(filters.status)
      const matchOperadora = filters.operadora === 'todas' || normalize(p.operadora) === normalize(filters.operadora)
  const matchAnalista = currentUser.tipo_usuario !== 'gestor' || filters.analista === 'todos' || String(p.criado_por) === String(filters.analista)
  const matchConsultor = currentUser.tipo_usuario !== 'gestor' || filters.consultor === 'todos' || normalize(p.consultor) === normalize(filters.consultor)
  // Permitir busca por código (PRP0001 etc.) como extra útil
  const matchCodigo = !qn || (p.codigo && String(p.codigo).toLowerCase().includes(qn))
  return matchText && matchCodigo && matchStatus && matchOperadora && matchAnalista && matchConsultor
    })
    // Ordenação por vidas (asc/desc). Empate: usa codigo asc; fallback criado_em asc
    return list.slice().sort((a, b) => {
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
  }, [proposals, filters, currentUser.tipo_usuario, vidasSortAsc])

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

  const startEdit = (p) => {
    setRowEdits(prev => ({
      ...prev,
      [p.id]: {
        quantidade_vidas: Number(p.quantidade_vidas || 0),
        valor: Number(p.valor || 0),
        previsao_implantacao: p.previsao_implantacao ? String(p.previsao_implantacao).slice(0,10) : '',
        operadora: p.operadora || '',
        consultor: p.consultor || '',
        consultor_email: p.consultor_email || '',
        criado_por: p.criado_por,
        arquivado: !!p.arquivado,
      }
    }))
  }
  const cancelEdit = (id) => setRowEdits(prev => { const cp = { ...prev }; delete cp[id]; return cp })
  const applyEdit = async (id) => {
    const payload = rowEdits[id]
    if (!payload) return
    const res = await onPatchProposal?.(id, payload)
    if (res?.ok) cancelEdit(id)
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
    // Validação de CNPJ antes de criar proposta (mantém comportamento)
    e.preventDefault()
    if (!currentUser) return

    // Validação de email do consultor
    const email = String(proposalForm.consultor_email || '').trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Informe um email de consultor válido')
      return
    }

    const valorNumber = parseMoneyToNumber(proposalForm.valor)
    if (!valorNumber || valorNumber <= 0) {
      toast.error('Informe um valor válido maior que zero')
      return
    }

    const cnpjResponse = await fetch('/api/validate-cnpj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj: proposalForm.cnpj })
    })
    const cnpjResult = await cnpjResponse.json()

    if (!cnpjResult.valid) {
      // Retorna erro para o handler pai exibir toast
      throw new Error(cnpjResult.error || 'CNPJ inválido')
    }
    if (currentUser.tipo_usuario === 'gestor') setCnpjValidationResult(cnpjResult.data)

    await onCreateProposal({
      ...proposalForm,
      valor: valorNumber,
      criado_por: currentUser.id,
      cnpjValidationData: cnpjResult.data,
      afterSuccess: () => {
  setProposalForm({ cnpj: '', consultor: '', consultor_email: '', operadora: '', quantidade_vidas: '', valor: '', previsao_implantacao: '', status: 'em análise' })
        setCnpjValidationResult(null)
        setIsDialogOpen(false)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {currentUser.tipo_usuario === 'gestor' ? 'Monitorar Propostas' : 'Gerenciar Propostas'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentUser.tipo_usuario === 'gestor' ? 'Visualize e monitore todas as propostas do sistema' : 'Crie, edite e gerencie suas propostas'}
          </p>
        </div>
  {currentUser.tipo_usuario === 'analista' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="w-4 h-4 mr-2" />
                Nova Proposta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Proposta</DialogTitle>
                <DialogDescription>Preencha os dados da nova proposta. O CNPJ será validado automaticamente.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input id="cnpj" placeholder="00.000.000/0000-00" value={proposalForm.cnpj} onChange={(e) => setProposalForm(prev => ({ ...prev, cnpj: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultor">Consultor</Label>
                    <Input id="consultor" placeholder="Nome do consultor" value={proposalForm.consultor} onChange={(e) => setProposalForm(prev => ({ ...prev, consultor: e.target.value }))} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="consultor_email">Email do Consultor</Label>
                    <Input id="consultor_email" type="email" placeholder="consultor@empresa.com" value={proposalForm.consultor_email} onChange={(e) => setProposalForm(prev => ({ ...prev, consultor_email: e.target.value }))} required />
                  </div>
                </div>

                {currentUser.tipo_usuario === 'gestor' && cnpjValidationResult && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        Dados da Empresa
                        <Badge variant="outline" className="text-xs">{cnpjValidationResult.source || 'API Externa'}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {cnpjValidationResult.razao_social && (<div><strong>Razão Social:</strong> {cnpjValidationResult.razao_social}</div>)}
                      {cnpjValidationResult.nome_fantasia && (<div><strong>Nome Fantasia:</strong> {cnpjValidationResult.nome_fantasia}</div>)}
                      {cnpjValidationResult.descricao_situacao_cadastral && (<div><strong>Situação:</strong> {cnpjValidationResult.descricao_situacao_cadastral}</div>)}
                      {cnpjValidationResult.cnae_fiscal_descricao && (<div><strong>Atividade Principal:</strong> {cnpjValidationResult.cnae_fiscal_descricao}</div>)}
                      {(cnpjValidationResult.logradouro || cnpjValidationResult.municipio) && (
                        <div>
                          <strong>Endereço:</strong> {[cnpjValidationResult.logradouro, cnpjValidationResult.numero, cnpjValidationResult.bairro, cnpjValidationResult.municipio, cnpjValidationResult.uf].filter(Boolean).join(', ')}
                          {cnpjValidationResult.cep && ` - CEP: ${cnpjValidationResult.cep}`}
                        </div>
                      )}
                      {cnpjValidationResult.telefone && (<div><strong>Telefone:</strong> {cnpjValidationResult.telefone}</div>)}
                      {cnpjValidationResult.email && (<div><strong>Email:</strong> {cnpjValidationResult.email}</div>)}
                      {cnpjValidationResult.capital_social && parseFloat(cnpjValidationResult.capital_social) > 0 && (
                        <div><strong>Capital Social:</strong> {formatCurrency(parseFloat(cnpjValidationResult.capital_social))}</div>
                      )}
                      {cnpjValidationResult.note && (<div className="text-amber-600 mt-2 p-2 bg-amber-50 rounded"><strong>Aviso:</strong> {cnpjValidationResult.note}</div>)}
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="operadora">Operadora</Label>
                    <Select value={proposalForm.operadora} onValueChange={(value) => setProposalForm(prev => ({ ...prev, operadora: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a operadora" />
                      </SelectTrigger>
                      <SelectContent>
                        {operadoras.map(op => (<SelectItem key={op} value={op}>{op}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantidade_vidas">Quantidade de Vidas</Label>
                    <Input id="quantidade_vidas" type="number" placeholder="0" value={proposalForm.quantidade_vidas} onChange={(e) => setProposalForm(prev => ({ ...prev, quantidade_vidas: e.target.value }))} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor do Plano</Label>
                    <Input
                      id="valor"
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex.: 1.500,00"
                      value={proposalForm.valor}
                      onChange={(e) => setProposalForm(prev => ({ ...prev, valor: formatMoneyBR(e.target.value) }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="previsao_implantacao">Previsão de Implantação</Label>
                    <Input id="previsao_implantacao" type="date" value={proposalForm.previsao_implantacao} onChange={(e) => setProposalForm(prev => ({ ...prev, previsao_implantacao: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={proposalForm.status} onValueChange={(value) => setProposalForm(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isLoading}>{isLoading ? 'Criando...' : 'Criar Proposta'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {currentUser.tipo_usuario !== 'gestor' && (
        <Card>
          <CardHeader>
            <CardTitle>Meta</CardTitle>
            <CardDescription>Progresso baseado em propostas implantadas</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const DEFAULT_TARGET = 200000
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
            })()}
          </CardContent>
        </Card>
      )}

    <Card>
        <CardHeader>
          <CardTitle>Lista de Propostas</CardTitle>
      <CardDescription>{filteredProposals.length} de {proposals.length} proposta(s)</CardDescription>
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
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
            <div>
              <Input
                placeholder="Buscar por CNPJ ou código (PRP0000)"
                value={filters.q}
                onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
              />
            </div>
            <div>
              <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {statusOptions.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filters.operadora} onValueChange={(v) => setFilters(prev => ({ ...prev, operadora: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Operadora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as operadoras</SelectItem>
                  {operadoras.map(op => (<SelectItem key={op} value={op}>{op}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {currentUser.tipo_usuario === 'gestor' && (
              <div>
                <Select value={filters.analista} onValueChange={(v) => setFilters(prev => ({ ...prev, analista: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Analista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os analistas</SelectItem>
                    {users.map(u => (<SelectItem key={u.id} value={String(u.id)}>{u.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {currentUser.tipo_usuario === 'gestor' && (
              <div>
                <Select value={filters.consultor} onValueChange={(v) => setFilters(prev => ({ ...prev, consultor: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Consultor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os consultores</SelectItem>
                    {consultores.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Ordenação por vidas (analista e gestor) */}
            <div className="flex items-center md:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVidasSortAsc(v => !v)}
                className="w-full md:w-auto min-h-10 inline-flex items-center gap-2"
                title={vidasSortAsc ? 'Ordenar Vidas: Decrescente' : 'Ordenar Vidas: Crescente'}
              >
                <ArrowUpDown className="w-4 h-4" />
                {vidasSortAsc ? 'Vidas Crescente' : 'Vidas Decrescente'}
              </Button>
            </div>
            <div className="flex items-center md:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFilters(defaultFilters)}
                className="w-full md:w-auto min-h-10"
              >
                Limpar filtros
              </Button>
            </div>
          </div>
          <TooltipProvider delayDuration={200}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Consultor</TableHead>
                {currentUser.tipo_usuario === 'gestor' && <TableHead>Email do Consultor</TableHead>}
                {currentUser.tipo_usuario === 'gestor' && <TableHead>Analista</TableHead>}
                <TableHead>Operadora</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => setVidasSortAsc(v => !v)}
                    className="inline-flex items-center gap-1 hover:underline cursor-pointer select-none"
                    title={vidasSortAsc ? 'Ordenar vidas: decrescente' : 'Ordenar vidas: crescente'}
                    aria-label="Ordenar por vidas"
                  >
                    Vidas {vidasSortAsc ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                {currentUser.tipo_usuario === 'gestor' && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProposals.map((proposal) => {
                const canEdit = (
                  currentUser.tipo_usuario === 'gestor' ||
                  String(proposal.criado_por) === String(currentUser.id) ||
                  (proposal.consultor_email && String(proposal.consultor_email).toLowerCase() === String(currentUser.email || '').toLowerCase())
                )
                const isUpdating = !!updatingStatus[proposal.id]
                const row = rowEdits[proposal.id]
                return (
                <TableRow key={proposal.id}>
                  <TableCell className="font-mono text-sm">{proposal.codigo || (proposal.id ? `PRP${String(proposal.id).slice(0,4).toUpperCase()}` : '-')}</TableCell>
                  <TableCell className="font-mono text-sm">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span onMouseEnter={() => fetchCnpjInfo(proposal.cnpj)} className="underline decoration-dotted cursor-help">
                          {formatCNPJ(proposal.cnpj)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {(() => {
                          const cnpj = String(proposal.cnpj || '').replace(/\D/g, '')
                          const info = cnpjInfoCache[cnpj]
                          if (!info) return 'Passar o mouse para buscar razão social'
                          if (info.loading) return 'Carregando…'
                          if (info.razao_social) return info.razao_social
                          if (info.nome_fantasia) return info.nome_fantasia
                          return info.error || 'Não encontrado'
                        })()}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{proposal.consultor}</TableCell>
                  {currentUser.tipo_usuario === 'gestor' && (
                    <TableCell className="font-mono text-xs">{proposal.consultor_email || '-'}</TableCell>
                  )}
                  {currentUser.tipo_usuario === 'gestor' && (
                    <TableCell>{(users.find(u => u.id === proposal.criado_por)?.nome) || '-'}</TableCell>
                  )}
                  <TableCell className="capitalize">
                    {currentUser.tipo_usuario === 'gestor' && row ? (
                      <Select value={row.operadora} onValueChange={(v) => setRowEdits(prev => ({ ...prev, [proposal.id]: { ...prev[proposal.id], operadora: v } }))}>
                        <SelectTrigger><SelectValue placeholder="Operadora" /></SelectTrigger>
                        <SelectContent>
                          {operadoras.map(op => (<SelectItem key={op} value={op}>{op}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="capitalize">{proposal.operadora}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {currentUser.tipo_usuario === 'gestor' && row ? (
                      <Input type="number" className="w-24" value={row.quantidade_vidas}
                        onChange={(e) => setRowEdits(prev => ({ ...prev, [proposal.id]: { ...prev[proposal.id], quantidade_vidas: Number(e.target.value || 0) } }))}
                      />
                    ) : (
                      proposal.quantidade_vidas
                    )}
                  </TableCell>
                  <TableCell>
                    {currentUser.tipo_usuario === 'gestor' && row ? (
                      <Input type="number" step="0.01" className="w-28" value={row.valor}
                        onChange={(e) => setRowEdits(prev => ({ ...prev, [proposal.id]: { ...prev[proposal.id], valor: Number(e.target.value || 0) } }))}
                      />
                    ) : (
                      formatCurrency(proposal.valor)
                    )}
                  </TableCell>
                  <TableCell>
                    {!canEdit ? (
                      <Badge variant="outline" className={getStatusBadgeClasses(proposal.status)}>
                        {String(proposal.status || '').charAt(0).toUpperCase() + String(proposal.status || '').slice(1)}
                      </Badge>
                    ) : (
                      <Select
                        value={proposal.status}
                        onValueChange={async (newStatus) => {
                          try {
                            setUpdatingStatus(prev => ({ ...prev, [proposal.id]: true }))
                            await onUpdateProposalStatus(proposal.id, newStatus, proposal)
                          } finally {
                            setUpdatingStatus(prev => ({ ...prev, [proposal.id]: false }))
                          }
                        }}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className={`w-56 capitalize ${getStatusBadgeClasses(proposal.status)} ${isUpdating ? 'opacity-80 cursor-wait' : ''}`}>
                          <div className="flex items-center w-full justify-between">
                            <SelectValue />
                            {isUpdating && <RefreshCw className="h-4 w-4 ml-2 animate-spin" />}
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(status => (
                            <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  {currentUser.tipo_usuario === 'gestor' && (
                    <TableCell>
                      {row ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          <Input
                            placeholder="Consultor"
                            className="w-36"
                            value={row.consultor}
                            onChange={(e) => setRowEdits(prev => ({ ...prev, [proposal.id]: { ...prev[proposal.id], consultor: e.target.value } }))}
                          />
                          <Input
                            placeholder="Email do consultor"
                            className="w-52"
                            type="email"
                            value={row.consultor_email}
                            onChange={(e) => setRowEdits(prev => ({ ...prev, [proposal.id]: { ...prev[proposal.id], consultor_email: e.target.value } }))}
                          />
                          <Select value={String(row.criado_por)} onValueChange={(v) => setRowEdits(prev => ({ ...prev, [proposal.id]: { ...prev[proposal.id], criado_por: v } }))}>
                            <SelectTrigger className="w-44"><SelectValue placeholder="Analista" /></SelectTrigger>
                            <SelectContent>
                              {users.map(u => (<SelectItem key={u.id} value={String(u.id)}>{u.nome}</SelectItem>))}
                            </SelectContent>
                          </Select>
                          <Input type="date" value={row.previsao_implantacao}
                            onChange={(e) => setRowEdits(prev => ({ ...prev, [proposal.id]: { ...prev[proposal.id], previsao_implantacao: e.target.value } }))}
                          />
                          <Button size="sm" onClick={() => applyEdit(proposal.id)}>Salvar</Button>
                          <Button size="sm" variant="outline" onClick={() => cancelEdit(proposal.id)}>Cancelar</Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 items-center">
                          <Button size="sm" variant="outline" onClick={() => startEdit(proposal)}>Editar</Button>
                          <Button size="sm" variant={proposal.arquivado ? 'secondary' : 'destructive'} onClick={() => onPatchProposal?.(proposal.id, { arquivado: !proposal.arquivado })}>
                            {proposal.arquivado ? 'Restaurar' : 'Arquivar'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAuditOpenFor(proposal.id)}>Histórico</Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )})}
            </TableBody>
          </Table>
          </TooltipProvider>
          {auditOpenFor && (
            <AuditDrawer id={auditOpenFor} onClose={() => setAuditOpenFor(null)} />
          )}
        </CardContent>
      </Card>
    </div>
  )
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
