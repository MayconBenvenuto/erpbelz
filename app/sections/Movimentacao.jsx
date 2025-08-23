'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Clock, Activity, CheckCircle2, XCircle, Pencil, Save, FileDown, Loader2 } from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { SOLICITACAO_STATUS } from '@/lib/constants'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { NovaSolicitacaoDialog } from '@/components/solicitacoes/NovaSolicitacaoDialog'

// Helper para formatar datas
const fmt = (d) => {
  try { return new Date(d).toLocaleDateString('pt-BR') } catch { return '-' }
}

const statusIcon = (s) => {
  switch (s) {
    case 'aberta': return <Activity className="h-4 w-4 text-blue-600" />
    case 'em validação': return <Clock className="h-4 w-4 text-amber-600" />
    case 'em execução': return <Activity className="h-4 w-4 text-purple-600" />
    case 'concluída': return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'cancelada': return <XCircle className="h-4 w-4 text-red-600" />
    default: return <Activity className="h-4 w-4" />
  }
}

export default function MovimentacaoSection({ currentUser, token: parentToken }) {
  const [openSolicitacao, setOpenSolicitacao] = useState(false)
  const [token, setToken] = useState(parentToken || '')
  const [solicitacoes, setSolicitacoes] = useState([])
  const [updating, setUpdating] = useState({}) // id -> boolean
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [reloading, setReloading] = useState(false)
  const [confirmStatus, setConfirmStatus] = useState(null) // { id, from, to }
  const [confirmBusy, setConfirmBusy] = useState(false)

  useEffect(() => {
    if (parentToken) {
      setToken(parentToken)
      return
    }
    if (typeof window !== 'undefined') {
      // prioridades: sessionStorage crm_token -> localStorage token (legacy)
      try {
        const sess = sessionStorage.getItem('crm_token')
        if (sess) { setToken(sess); return }
      } catch {}
      const legacy = localStorage.getItem('token')
      if (legacy) setToken(legacy)
    }
  }, [parentToken])

  const loadSolicitacoes = useCallback(async () => {
    setReloading(true)
    try {
      const res = await fetch('/api/solicitacoes', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await res.json().catch(()=>({}))
      if (res.ok) setSolicitacoes(Array.isArray(data.data)?data.data:[])
      else toast.error(data.message || 'Erro ao carregar solicitações')
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setReloading(false)
    }
  }, [token])

  useEffect(() => { loadSolicitacoes() }, [loadSolicitacoes])

  // Recarrega após criação de nova solicitação (evento disparado no dialog)
  useEffect(() => {
    const handler = () => { loadSolicitacoes() }
    if (typeof window !== 'undefined') {
      window.addEventListener('solicitacao:created', handler)
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('solicitacao:created', handler)
    }
  }, [loadSolicitacoes])

  const groupedByStatus = useMemo(() => {
    const g = {}
    for (const s of SOLICITACAO_STATUS) g[s] = []
    for (const sol of solicitacoes) {
      g[sol.status || 'aberta']?.push(sol)
    }
    return g
  }, [solicitacoes])

  const hoje = useMemo(() => new Date(), [])
  const stats = useMemo(() => {
    const total = solicitacoes.length
    const atrasadas = solicitacoes.filter(s => s.sla_previsto && new Date(s.sla_previsto) < hoje && s.status !== 'concluída' && s.status !== 'cancelada').length
    const concluidas = solicitacoes.filter(s => s.status === 'concluída').length
    // SLA médio aberto (dias restantes)
    const abertos = solicitacoes.filter(s => !['concluída','cancelada'].includes(s.status))
    const diasRest = abertos.map(s => (s.sla_previsto ? (new Date(s.sla_previsto) - hoje) / 86400000 : null)).filter(v => v !== null)
    const mediaDias = diasRest.length ? (diasRest.reduce((a,b)=>a+b,0)/diasRest.length) : null
    return { total, atrasadas, concluidas, mediaDias }
  }, [solicitacoes, hoje])

  const updateStatus = async (id, status) => {
    // Se vier de ação direta (sem bypass) abre confirmação primeiro
    if (!confirmBusy && !confirmStatus?.bypass) {
      const sol = solicitacoes.find(s => s.id === id)
      setConfirmStatus({ id, from: sol?.status, to: status })
      return
    }
    setUpdating(prev => ({ ...prev, [id]: true }))
    try {
      const body = status ? { status } : {}
      const res = await fetch(`/api/solicitacoes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || 'Falha ao atualizar')
      } else {
        toast.success('Status atualizado')
        await loadSolicitacoes()
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setUpdating(prev => ({ ...prev, [id]: false }))
    }
  }

  const claim = async (id) => {
    setUpdating(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/solicitacoes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ claim: true }) })
      const data = await res.json()
      if (!res.ok) toast.error(data.message || 'Falha ao assumir')
      else { toast.success('Solicitação atribuída'); await loadSolicitacoes() }
    } catch { toast.error('Erro de conexão') }
    finally { setUpdating(prev => ({ ...prev, [id]: false })) }
  }

  const openDetails = async (id) => {
    setDetailLoading(true)
    setDetail(null)
    setDetailOpen(true)
    try {
      const res = await fetch(`/api/solicitacoes/${id}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || 'Erro ao carregar detalhes')
        setDetailOpen(false)
      } else {
        setDetail(data.data)
      }
    } catch {
      toast.error('Erro de conexão')
      setDetailOpen(false)
    } finally { setDetailLoading(false) }
  }

  const updateSla = async (id, sla) => {
    setUpdating(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/solicitacoes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ sla_previsto: sla }) })
      const data = await res.json()
      if (!res.ok) toast.error(data.message || 'Falha ao atualizar SLA')
      else {
        toast.success('SLA atualizado')
        await loadSolicitacoes()
      }
    } catch { toast.error('Erro de conexão') }
    finally { setUpdating(prev => ({ ...prev, [id]: false })) }
  }

  // CONSULTOR layout
  if (currentUser?.tipo_usuario === 'consultor') {
    return (
      <div className="grid gap-6">
    <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Minhas Movimentações</h2>
      <p className="text-sm text-muted-foreground flex items-center gap-2">Acompanhe suas solicitações. {reloading && <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Atualizando" />}</p>
          </div>
          <Button onClick={() => setOpenSolicitacao(true)} className="bg-primary">Nova Solicitação</Button>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase">
              <tr className="text-left">
                <th className="p-2">Código</th>
                <th className="p-2">Empresa</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Status</th>
                <th className="p-2">SLA</th>
                <th className="p-2">Analista</th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map(s => (
                <tr key={s.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{s.codigo || '—'}</td>
                  <td className="p-2 truncate max-w-[160px]" title={s.razao_social}>{s.razao_social}</td>
                  <td className="p-2 capitalize">{s.tipo}{s.subtipo ? `/${s.subtipo}` : ''}</td>
                  <td className="p-2 capitalize">{s.status}</td>
                  <td className="p-2 text-xs">{s.sla_previsto ? fmt(s.sla_previsto) : '—'}</td>
                  <td className="p-2 text-xs">{s.atendido_por_nome || '—'}</td>
                </tr>
              ))}
              {solicitacoes.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">Nenhuma solicitação</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <NovaSolicitacaoDialog open={openSolicitacao} onOpenChange={setOpenSolicitacao} token={token} />
      </div>
    )
  }

  return (
    <div className="grid gap-6">
    <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Movimentação</h2>
      <p className="text-sm text-muted-foreground flex items-center gap-2">Gerencie solicitações e acompanhe SLA. {reloading && <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Atualizando" />}</p>
        </div>
        {currentUser?.tipo_usuario !== 'analista' && (
          <Button onClick={() => setOpenSolicitacao(true)} className="bg-primary">Nova Solicitação</Button>
        )}
      </div>

      {/* Dashboard Consultor / Analista */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Concluídas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.concluidas}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Atrasadas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{stats.atrasadas}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Média dias restante</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.mediaDias !== null ? stats.mediaDias.toFixed(1) : '—'}</div></CardContent>
        </Card>
      </div>

      {/* Kanban simples por status */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {SOLICITACAO_STATUS.map(status => (
          <div key={status} className="border rounded-md bg-card flex flex-col max-h-[520px]">
            <div className="p-2 border-b flex items-center gap-2 text-sm font-medium capitalize">
              {statusIcon(status)} {status}
              <span className="ml-auto text-xs text-muted-foreground">{groupedByStatus[status]?.length || 0}</span>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto">
              {groupedByStatus[status]?.map(sol => (
                <div key={sol.id} className="rounded border p-2 bg-background text-xs space-y-1">
                  <div className="font-medium truncate flex items-center gap-1" title={sol.razao_social}>
                    <span className="font-mono text-[10px] px-1 py-0.5 bg-muted rounded">{sol.codigo || '—'}</span>
                    <span className="truncate">{sol.razao_social}</span>
                  </div>
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="text-muted-foreground">{sol.tipo}{sol.subtipo ? `/${sol.subtipo}` : ''}</span>
                    <SlaEditor sol={sol} hoje={hoje} canEdit={currentUser?.tipo_usuario === 'gestor' || (currentUser?.tipo_usuario === 'analista' && String(sol.atendido_por) === String(currentUser?.id))} onSave={updateSla} busy={updating[sol.id]} />
                  </div>
                  {currentUser?.tipo_usuario === 'analista' && !sol.atendido_por && (
                    <div className="flex mb-1">
                      <button disabled={updating[sol.id]} onClick={() => claim(sol.id)} className="px-2 py-0.5 text-[11px] bg-primary text-white rounded disabled:opacity-50">Assumir</button>
                    </div>
                  )}
                  {currentUser?.tipo_usuario === 'analista' && sol.atendido_por && String(sol.atendido_por) === String(currentUser?.id) && (
                    <div className="flex gap-1 flex-wrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            disabled={updating[sol.id]}
                            className="px-2 py-0.5 text-[11px] rounded bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                            aria-label="Ações da solicitação"
                          >
                            Ações
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                          <DropdownMenuLabel className="text-[11px]">Solicitação</DropdownMenuLabel>
                          <DropdownMenuItem className="text-[12px]" onClick={() => openDetails(sol.id)}>
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-[11px]">Alterar status</DropdownMenuLabel>
                          {SOLICITACAO_STATUS.filter(s => s !== sol.status).map(next => (
                            <DropdownMenuItem
                              key={next}
                              className="text-[12px] capitalize"
                              disabled={updating[sol.id]}
                              onClick={() => updateStatus(sol.id, next)}
                            >
                              {next}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  {currentUser?.tipo_usuario === 'analista' && sol.atendido_por && String(sol.atendido_por) !== String(currentUser?.id) && (
                    <div className="text-[10px] text-muted-foreground">Em análise por {sol.atendido_por_nome || 'outro analista'}</div>
                  )}
                  {currentUser?.tipo_usuario !== 'analista' && sol.atendido_por_nome && (
                    <div className="text-[10px] text-muted-foreground">Analista: {sol.atendido_por_nome}</div>
                  )}
                </div>
              ))}
              {groupedByStatus[status]?.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-4">Sem itens</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline detalhada (Gestor) */}
      {currentUser?.tipo_usuario === 'gestor' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold mt-2">Linhas do tempo</h3>
          <div className="space-y-4">
            {solicitacoes.slice(0,25).map(sol => (
              <Card key={sol.id} className="">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1 py-0.5 bg-muted rounded" title={sol.codigo}>{sol.codigo}</span>
                    <span className="truncate" title={sol.razao_social}>{sol.razao_social}</span>
                    <span className="text-xs font-normal text-muted-foreground">{sol.tipo}{sol.subtipo ? `/${sol.subtipo}` : ''}</span>
                    <div className="ml-auto"><SlaEditor sol={sol} hoje={hoje} canEdit={true} onSave={updateSla} busy={updating[sol.id]} compact /></div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {sol.atendido_por_nome && <div className="text-[10px] mb-1 text-muted-foreground">Analista: {sol.atendido_por_nome}</div>}
                  <ol className="relative border-l ml-2 pl-4 space-y-3">
                    {(Array.isArray(sol.historico) ? sol.historico : []).slice(-15).map((ev,i) => (
                      <li key={i} className="space-y-0.5">
                        <div className="absolute -left-[9px] bg-background border rounded-full h-4 w-4 flex items-center justify-center">
                          {statusIcon(ev.status)}
                        </div>
                        <div className="text-xs font-medium capitalize">{ev.status}</div>
                        <div className="text-[11px] text-muted-foreground">{fmt(ev.em)}</div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <NovaSolicitacaoDialog open={openSolicitacao} onOpenChange={setOpenSolicitacao} token={token} />
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2">
          <div className="bg-background w-full max-w-2xl rounded-md border shadow-lg max-h-[90vh] overflow-y-auto p-4 space-y-4">
            <div className="flex items-start gap-2">
              <h3 className="font-semibold text-lg">Detalhes da Solicitação {detail?.codigo && <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{detail.codigo}</span>}</h3>
              <button className="ml-auto text-sm text-muted-foreground hover:text-foreground" onClick={() => setDetailOpen(false)}>Fechar</button>
            </div>
            {detailLoading && <p className="text-sm">Carregando...</p>}
            {!detailLoading && detail && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">Empresa:</span> {detail.razao_social}</div>
                  <div><span className="font-medium">CNPJ:</span> {detail.cnpj}</div>
                  <div><span className="font-medium">Tipo:</span> {detail.tipo}{detail.subtipo?`/${detail.subtipo}`:''}</div>
                  <div><span className="font-medium">Status:</span> {detail.status}</div>
                  <div><span className="font-medium">SLA:</span> {detail.sla_previsto?fmt(detail.sla_previsto):'—'}</div>
                  <div><span className="font-medium">Analista:</span> {detail.atendido_por_nome || '—'}</div>
                  <div className="col-span-2 text-xs mt-1">
                    <span className="font-medium">Consultor solicitante:</span> {detail.criado_por_nome ? (
                      <>
                        {detail.criado_por_nome} {detail.criado_por_email && <span className="text-muted-foreground">(&lt;{detail.criado_por_email}&gt;)</span>}
                      </>
                    ) : '—'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Observações:</span>
                  <p className="text-xs whitespace-pre-wrap mt-1 border rounded p-2 bg-muted/30">{detail.observacoes || '—'}</p>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">Arquivos</div>
                  <div className="grid gap-2 max-h-56 overflow-y-auto">
                    {Array.isArray(detail.arquivos) && detail.arquivos.length > 0 ? detail.arquivos.map(a => (
                      <div key={a.path || a.url} className="flex items-center gap-2 text-xs border rounded p-2 bg-background">
                        <span className="flex-1 truncate" title={a.nome}>{a.nome || a.path}</span>
                        {a.url && <a className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-white hover:bg-primary/90" href={a.url} target="_blank" rel="noopener noreferrer" download>
                          <FileDown className="h-3.5 w-3.5" /> Baixar
                        </a>}
                      </div>
                    )) : <p className="text-xs text-muted-foreground">Nenhum arquivo</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">Histórico</div>
                  <ol className="relative border-l ml-2 pl-4 space-y-3">
                    {(Array.isArray(detail.historico)?detail.historico:[]).slice(-30).map((ev,i)=>(
                      <li key={i} className="space-y-0.5">
                        <div className="absolute -left-[9px] bg-background border rounded-full h-4 w-4 flex items-center justify-center">
                          {statusIcon(ev.status)}
                        </div>
                        <div className="text-xs font-medium capitalize">{ev.status}</div>
                        <div className="text-[11px] text-muted-foreground">{fmt(ev.em)}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Confirmação de mudança de status */}
      <AlertDialog open={!!confirmStatus} onOpenChange={(o)=>{ if(!o) setConfirmStatus(null) }}>
        {confirmStatus && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm">Confirmar mudança de status</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Alterar de <span className="font-medium">{confirmStatus.from}</span> para <span className="font-medium">{confirmStatus.to}</span>? Essa ação será registrada no histórico.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirmBusy} onClick={()=>setConfirmStatus(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmBusy}
                onClick={async () => {
                  if(!confirmStatus) return
                  setConfirmBusy(true)
                  await updateStatus(confirmStatus.id, confirmStatus.to, true)
                  setConfirmBusy(false)
                  setConfirmStatus(null)
                }}
              >
                {confirmBusy ? 'Salvando...' : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  )
}

function SlaEditor({ sol, hoje, canEdit, onSave, busy, compact }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(sol.sla_previsto || '')
  const overdue = sol.sla_previsto && new Date(sol.sla_previsto) < hoje && !['concluída','cancelada'].includes(sol.status)
  const color = overdue ? 'text-red-600' : ''
  if (!editing) {
    return (
      <div className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-[11px]'} ${color}`}>
        <span>{sol.sla_previsto ? fmt(sol.sla_previsto) : '—'}</span>
        {canEdit && <button type="button" aria-label="Editar SLA" className="opacity-70 hover:opacity-100" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></button>}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <input type="date" className="border rounded px-1 py-0.5 text-[11px]" value={value} onChange={e => setValue(e.target.value)} />
      <button disabled={busy || !value} type="button" className="text-primary disabled:opacity-40" onClick={() => { onSave(sol.id, value); setEditing(false) }}><Save className="h-3.5 w-3.5" /></button>
      <button type="button" className="text-muted-foreground" onClick={() => { setEditing(false); setValue(sol.sla_previsto || '') }}>×</button>
    </div>
  )
}
