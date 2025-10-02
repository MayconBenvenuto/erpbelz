'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FileText, Target, TrendingUp, RefreshCw, ArrowUpDown, X, Activity, Award, Clock, Search, Users } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { formatCurrency, getStatusBadgeClasses } from '@/lib/utils'
import { STATUS_OPTIONS } from '@/lib/constants'
import { useEffect, useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { LineChart as RLineChart, Line, CartesianGrid, XAxis, YAxis, BarChart as RBarChart, Bar, PieChart as RPieChart, Pie, Cell } from 'recharts'

export default function DashboardSection({ currentUser, proposals, userGoals, users = [], solicitacoes = [] }) {
  const [statusSortAsc, setStatusSortAsc] = useState(false)
  const [operadorasSortAsc, setOperadorasSortAsc] = useState(false)
  const [macroMode, setMacroMode] = useState('abs') // 'abs' | 'perc'
  const [statusFilter, setStatusFilter] = useState('todos')
  const [consultorFilter, setConsultorFilter] = useState('todos')
  const [vidasFilter, setVidasFilter] = useState('todos')
  const [periodFilter, setPeriodFilter] = useState('30d') // '7d' | '30d' | 'mes' | 'ano' | 'todos'
  const [operadoraFilter, setOperadoraFilter] = useState('todas')
  const [search, setSearch] = useState('')
  const [activeDashTab, setActiveDashTab] = useState('propostas')
  const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const onlyDigits = (s) => String(s || '').replace(/\D+/g, '')

  // Persistência do filtro de status por usuário
  useEffect(() => {
    try {
  const key = `erp:dashboard:statusFilter:${currentUser?.id || 'anon'}`
      const saved = localStorage.getItem(key)
      if (saved) setStatusFilter(saved)
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  useEffect(() => {
    try {
  const key = `erp:dashboard:statusFilter:${currentUser?.id || 'anon'}`
      localStorage.setItem(key, statusFilter)
    } catch (_) {}
  }, [statusFilter, currentUser?.id])

  // Persistência do filtro de consultor por usuário
  useEffect(() => {
    try {
  const key = `erp:dashboard:consultorFilter:${currentUser?.id || 'anon'}`
      const saved = localStorage.getItem(key)
      if (saved) setConsultorFilter(saved)
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  useEffect(() => {
    try {
  const key = `erp:dashboard:consultorFilter:${currentUser?.id || 'anon'}`
      localStorage.setItem(key, consultorFilter)
    } catch (_) {}
  }, [consultorFilter, currentUser?.id])

  // Persistência do filtro de vidas por usuário
  useEffect(() => {
    try {
  const key = `erp:dashboard:vidasFilter:${currentUser?.id || 'anon'}`
      const saved = localStorage.getItem(key)
      if (saved) setVidasFilter(saved)
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  useEffect(() => {
    try {
  const key = `erp:dashboard:vidasFilter:${currentUser?.id || 'anon'}`
      localStorage.setItem(key, vidasFilter)
    } catch (_) {}
  }, [vidasFilter, currentUser?.id])

  // Persistência do filtro de período
  useEffect(() => {
    try {
  const key = `erp:dashboard:periodFilter:${currentUser?.id || 'anon'}`
      const saved = localStorage.getItem(key)
      if (saved) setPeriodFilter(saved)
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  useEffect(() => {
    try {
  const key = `erp:dashboard:periodFilter:${currentUser?.id || 'anon'}`
      localStorage.setItem(key, periodFilter)
    } catch (_) {}
  }, [periodFilter, currentUser?.id])

  // Persistência do filtro de operadora
  useEffect(() => {
    try {
  const key = `erp:dashboard:operadoraFilter:${currentUser?.id || 'anon'}`
      const saved = localStorage.getItem(key)
      if (saved) setOperadoraFilter(saved)
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  useEffect(() => {
    try {
  const key = `erp:dashboard:operadoraFilter:${currentUser?.id || 'anon'}`
      localStorage.setItem(key, operadoraFilter)
    } catch (_) {}
  }, [operadoraFilter, currentUser?.id])

  // Persistência da aba ativa (somente gestor/gerente usa)
  useEffect(() => {
    try {
  const key = `erp:dashboard:tab:${currentUser?.id || 'anon'}`
      const saved = localStorage.getItem(key)
      if (saved) setActiveDashTab(saved)
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  useEffect(() => {
    try {
  const key = `erp:dashboard:tab:${currentUser?.id || 'anon'}`
      localStorage.setItem(key, activeDashTab)
    } catch (_) {}
  }, [activeDashTab, currentUser?.id])

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
    if (operadoraFilter !== 'todas') {
      items.push({ key: 'operadora', label: `operadora: ${operadoraFilter}`, onClear: () => setOperadoraFilter('todas') })
    }
    if (periodFilter !== 'todos') {
      const periodMap = { '7d': 'últimos 7 dias', '30d': 'últimos 30 dias', 'mes': 'este mês', 'ano': 'este ano' }
      items.push({ key: 'periodo', label: `período: ${periodMap[periodFilter] || periodFilter}`, onClear: () => setPeriodFilter('todos') })
    }
    if (search.trim()) {
      items.push({ key: 'busca', label: `busca: ${search.trim()}`, onClear: () => setSearch('') })
    }
    return items
  }, [statusFilter, consultorFilter, vidasFilter, operadoraFilter, periodFilter, search])

  const filteredProposals = useMemo(() => {
    let list = proposals
    // Filtro por período (criado_em)
    if (periodFilter !== 'todos') {
      const now = new Date()
      let start = null
      if (periodFilter === '7d') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
      } else if (periodFilter === '30d') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
      } else if (periodFilter === 'mes') {
        start = new Date(now.getFullYear(), now.getMonth(), 1)
      } else if (periodFilter === 'ano') {
        start = new Date(now.getFullYear(), 0, 1)
      }
      if (start) {
        const startTs = start.getTime()
        list = list.filter(p => {
          const t = p?.criado_em ? new Date(p.criado_em).getTime() : NaN
          return !isNaN(t) && t >= startTs
        })
      }
    }
    if (statusFilter !== 'todos') list = list.filter(p => normalize(p.status) === normalize(statusFilter))
    if (consultorFilter !== 'todos') list = list.filter(p => normalize(p.consultor) === normalize(consultorFilter))
    if (operadoraFilter !== 'todas') list = list.filter(p => normalize(p.operadora) === normalize(operadoraFilter))
    // Busca livre em código e CNPJ (quando existir)
    if (search.trim()) {
      const q = normalize(search)
      const qDigits = onlyDigits(search)
      list = list.filter(p => {
        const cod = normalize(p.codigo || '')
        const cnpj = onlyDigits(p.cnpj || '')
        return (cod && cod.includes(q)) || (qDigits && cnpj.includes(qDigits))
      })
    }
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
  }, [proposals, statusFilter, consultorFilter, vidasFilter, operadoraFilter, periodFilter, search])

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
  const maxStatusCount = useMemo(() => statusCounts.reduce((m, s) => s.count > m ? s.count : m, 0), [statusCounts])

  const topOperadoras = useMemo(() => {
    const map = {}
    filteredProposals.forEach(p => {
      if (!map[p.operadora]) map[p.operadora] = { operadora: p.operadora, count: 0, implantadas: 0 }
      map[p.operadora].count++
      if (p.status === 'implantado') map[p.operadora].implantadas++
    })
    return Object.values(map)
      .map(o => ({ ...o, conv: o.count ? (o.implantadas / o.count) * 100 : 0 }))
      .sort((a,b) => operadorasSortAsc ? a.count - b.count : b.count - a.count)
      .slice(0,6)
  }, [filteredProposals, operadorasSortAsc])
  const maxOperadora = useMemo(() => topOperadoras.reduce((m,o)=> o.count>m?o.count:m,0), [topOperadoras])

  const conversionPerc = useMemo(() => totalProposals ? (implantedProposals / totalProposals) * 100 : 0, [totalProposals, implantedProposals])
  const topOperadorasPie = useMemo(() => topOperadoras.slice(0,5).map(o => ({ name: o.operadora, value: o.count, conv: Math.round(o.conv) })), [topOperadoras])
  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4']

  // Aging buckets
  const agingBuckets = useMemo(() => {
    const now = Date.now()
    const defs = [
      { key: 'lt8', label: '<8h', test: (ms) => ms < 8*3600e3 },
      { key: '8_24', label: '8–24h', test: (ms) => ms >= 8*3600e3 && ms < 24*3600e3 },
      { key: '1_2d', label: '1–2d', test: (ms) => ms >= 24*3600e3 && ms < 48*3600e3 },
      { key: '3_5d', label: '3–5d', test: (ms) => ms >= 72*3600e3 && ms < 120*3600e3 },
      { key: 'gt5d', label: '>5d', test: (ms) => ms >= 120*3600e3 }
    ]
    const counts = defs.map(d => ({ ...d, count: 0 }))
    filteredProposals.forEach(p => {
      const created = new Date(p.criado_em).getTime(); if (isNaN(created)) return
      const age = now - created
      const bucket = counts.find(c => c.test(age))
      if (bucket) bucket.count++
    })
    const total = counts.reduce((s,c)=>s+c.count,0) || 1
    return counts.map(c => ({ ...c, perc: (c.count/total)*100 }))
  }, [filteredProposals])

  // SLA assunção
  const slaAssuncao = useMemo(() => {
    const diffs = filteredProposals
      .filter(p => p.atendido_em && p.criado_em)
      .map(p => { const t1 = new Date(p.criado_em).getTime(); const t2 = new Date(p.atendido_em).getTime(); return (!isNaN(t1)&&!isNaN(t2)&&t2>=t1)?(t2-t1):null })
      .filter(Boolean)
    if (!diffs.length) return { mediaH:0,p95H:0,perc8:0,perc24:0,total:0 }
    const sorted=[...diffs].sort((a,b)=>a-b)
    const media=diffs.reduce((s,v)=>s+v,0)/diffs.length
    const p95=sorted[Math.min(sorted.length-1, Math.floor(sorted.length*0.95))]
    const perc8=(diffs.filter(d=> d<=8*3600e3).length/diffs.length)*100
    const perc24=(diffs.filter(d=> d<=24*3600e3).length/diffs.length)*100
    return { mediaH: media/3600e3, p95H: p95/3600e3, perc8, perc24, total: diffs.length }
  }, [filteredProposals])

  // Evolução 7 dias
  const evolution7d = useMemo(() => {
    const days=[]; const now=new Date();
    for(let i=6;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i); const key=d.toISOString().slice(0,10); days.push({date:key,created:0,implanted:0}) }
    const map=Object.fromEntries(days.map(d=>[d.date,d]))
    filteredProposals.forEach(p=>{ const c=p.criado_em?new Date(p.criado_em).toISOString().slice(0,10):null; if(c&&map[c]) map[c].created++; if(p.status==='implantado'){ const u=p.updated_at?new Date(p.updated_at).toISOString().slice(0,10):c; if(u&&map[u]) map[u].implanted++; } })
    return days
  }, [filteredProposals])

  // Buckets de valor
  const valueBuckets = useMemo(() => {
    const defs=[
      { label:'0–5k', test:v=>v<5000 },
      { label:'5–20k', test:v=>v>=5000 && v<20000 },
      { label:'20–50k', test:v=>v>=20000 && v<50000 },
      { label:'50k+', test:v=>v>=50000 }
    ]
    const arr=defs.map(d=>({...d,count:0,total:0}))
    filteredProposals.forEach(p=>{ const val=Number(p.valor||0); const b=arr.find(x=>x.test(val)); if(b){b.count++; b.total+=val} })
    const grand=arr.reduce((s,b)=>s+b.count,0)||1
    return arr.map(b=>({...b, perc:(b.count/grand)*100 }))
  }, [filteredProposals])

  // Forecast meta
  const forecastMeta = useMemo(() => {
  if (!['gestor','gerente'].includes(currentUser.tipo_usuario)) return null
    const now=new Date(); const year=now.getFullYear(); const month=now.getMonth();
    const daysInMonth=new Date(year,month+1,0).getDate(); const today=now.getDate();
    const diasPassados=today; const diasRestantes=Math.max(0, daysInMonth - today)
    const implantedValues=proposals.filter(p=>p.status==='implantado').map(p=>Number(p.valor||0))
    const valorTotalImplantado=implantedValues.reduce((s,v)=>s+v,0)
    const mediaDia=diasPassados?valorTotalImplantado/diasPassados:0
    const projecao=valorTotalImplantado + mediaDia * diasRestantes
    const analystIds=users.filter(u=>u.tipo_usuario!=='gestor').map(u=>u.id)
    const DEFAULT_TARGET=200000
    let totalTarget=0
    analystIds.forEach(uid=>{ const goal=userGoals.find(g=>g.usuario_id===uid); const target=Number(goal?.valor_meta ?? DEFAULT_TARGET); totalTarget+=target })
    const percAtual= totalTarget ? (valorTotalImplantado/totalTarget)*100 : 0
    const percProj= totalTarget ? (projecao/totalTarget)*100 : 0
    return { valorTotalImplantado, mediaDia, projecao, totalTarget, percAtual, percProj, diasRestantes }
  }, [currentUser.tipo_usuario, proposals, users, userGoals])

  // Ranking de analistas (somente gestor)
  const analystRanking = useMemo(() => {
  if (!['gestor','gerente'].includes(currentUser.tipo_usuario)) return []
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

  // Métricas de movimentações (solicitações) para gestor
  const movStats = useMemo(() => {
  if (!['gestor','gerente'].includes(currentUser.tipo_usuario)) return null
    const total = solicitacoes.length
    if (!total) return { total:0, abertas:0, andamento:0, concluidas:0, canceladas:0, atrasadas:0, pctAtrasadas:0, slaAssuncaoH:0 }
    let abertas=0,andamento=0,concluidas=0,canceladas=0,atrasadas=0
    let slaSum=0,slaCount=0
    const now = Date.now()
    solicitacoes.forEach(s => {
      const st = s.status || 'aberta'
      if (st === 'aberta') abertas++
      else if (st === 'em validação' || st === 'em execução') andamento++
      else if (st === 'concluída') concluidas++
      else if (st === 'cancelada') canceladas++
      if (s.sla_previsto && !['concluída','cancelada'].includes(st)) {
        const due = new Date(s.sla_previsto).getTime(); if (!isNaN(due) && due < now) atrasadas++
      }
      if (Array.isArray(s.historico)) {
        const created = s.historico.find(h => h.status === 'aberta')?.em
        const firstNext = s.historico.find(h => h.status && h.status !== 'aberta')?.em
        if (created && firstNext) {
          const t1=new Date(created).getTime(); const t2=new Date(firstNext).getTime();
            if(!isNaN(t1)&&!isNaN(t2)&&t2>=t1){ slaSum += (t2-t1); slaCount++ }
        }
      }
    })
    const slaAssuncaoH = slaCount ? (slaSum/slaCount)/3600e3 : 0
    const pctAtrasadas = total ? (atrasadas/total)*100 : 0
    return { total, abertas, andamento, concluidas, canceladas, atrasadas, pctAtrasadas, slaAssuncaoH }
  }, [solicitacoes, currentUser.tipo_usuario])

  // (heatmap removido)

  // Consultores únicos para dropdown
  const consultores = useMemo(() => {
    return Array.from(new Set(proposals.map(p => p.consultor).filter(Boolean))).sort((a, b) => normalize(a).localeCompare(normalize(b)))
  }, [proposals])

  // Operadoras únicas para dropdown
  const operadoras = useMemo(() => {
    return Array.from(new Set(proposals.map(p => p.operadora).filter(Boolean))).sort((a, b) => normalize(a).localeCompare(normalize(b)))
  }, [proposals])

  // Helpers / timelines para analista
  const formatDateTime = (dt) => {
    if (!dt) return '—'
    try { return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
  }

  const analystProposalTimeline = useMemo(() => {
    if (currentUser.tipo_usuario !== 'analista') return []
    return proposals
      .map(p => ({
        id: p.id,
        codigo: p.codigo || p.id?.slice(0,8),
        status: p.status,
        criado_em: p.criado_em,
        atendido_em: p.atendido_em,
        implantado: p.status === 'implantado',
        valor: p.valor,
        atendido_por: p.atendido_por,
      }))
      .sort((a,b)=> new Date(b.criado_em) - new Date(a.criado_em))
      .slice(0,12)
  }, [proposals, currentUser.tipo_usuario])

  const analystMovTimeline = useMemo(() => {
    if (currentUser.tipo_usuario !== 'analista') return []
    return (solicitacoes || [])
      .filter(s => String(s.criado_por) === String(currentUser.id) || String(s.atendido_por) === String(currentUser.id))
      .map(s => ({
        id: s.id,
        codigo: s.codigo || s.id?.slice(0,8),
        status: s.status || 'aberta',
        criado_em: s.criado_em,
        atualizado_em: s.atualizado_em,
        tipo: s.tipo,
        subtipo: s.subtipo,
      }))
      .sort((a,b)=> new Date(b.criado_em) - new Date(a.criado_em))
      .slice(0,12)
  }, [solicitacoes, currentUser])

  const movStatusColor = (st) => {
    switch(st){
      case 'aberta': return 'bg-blue-500'
      case 'em validação': return 'bg-amber-500'
      case 'em execução': return 'bg-purple-500'
      case 'concluída': return 'bg-green-500'
      case 'cancelada': return 'bg-red-500'
      default: return 'bg-amber-500'
    }
  }

  const latestProposals = useMemo(() => {
    return [...filteredProposals].sort((a,b)=> new Date(b.criado_em) - new Date(a.criado_em)).slice(0,8)
  }, [filteredProposals])

  const overdueSolicitacoes = useMemo(() => {
    if (!['gestor','gerente'].includes(currentUser.tipo_usuario)) return []
    const now = Date.now()
    return (solicitacoes||[])
      .filter(s => s.sla_previsto && !['concluída','cancelada'].includes(s.status || 'aberta'))
      .filter(s => {
        const due = new Date(s.sla_previsto).getTime(); return !isNaN(due) && due < now
      })
      .sort((a,b)=> new Date(a.sla_previsto) - new Date(b.sla_previsto))
      .slice(0,8)
  }, [solicitacoes, currentUser.tipo_usuario])

  // Métricas da Equipe (presença)
  const teamStats = useMemo(() => {
    if (!['gestor','gerente'].includes(currentUser.tipo_usuario)) return null
    const monitored = (users || []).filter(u => u && u.tipo_usuario !== 'gestor')
    const total = monitored.length
    const isOnline = (u) => u?.status_presenca === 'online' || u?.online === true
    const online = monitored.filter(isOnline).length
    const sortedByRefresh = [...monitored].filter(u => u?.ultimo_refresh).sort((a,b) => new Date(b.ultimo_refresh) - new Date(a.ultimo_refresh))
    const latest = sortedByRefresh[0]?.ultimo_refresh || null
    const topRecent = sortedByRefresh.slice(0,8)
    return { total, online, latest, topRecent }
  }, [users, currentUser.tipo_usuario])

  return (
    <div className="space-y-6">
      {['gestor','gerente'].includes(currentUser.tipo_usuario) && (
        <SLARealTimeWatcher proposals={proposals} currentUser={currentUser} />
      )}
      {['gestor','gerente'].includes(currentUser.tipo_usuario) && activeDashTab === 'equipe' && teamStats && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Equipe Monitorada</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{teamStats.total}</div>
                <p className="text-xs text-muted-foreground">Analistas (exclui gestores)</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online agora</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{teamStats.online}</div>
                <p className="text-xs text-muted-foreground">Com presença ativa</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Último refresh</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{teamStats.latest ? new Date(teamStats.latest).toLocaleString('pt-BR') : '—'}</div>
                <p className="text-xs text-muted-foreground">Atualização mais recente</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cobertura</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm">View de presença e monitoramento</div>
                <p className="text-[10px] text-muted-foreground">vw_usuarios_online (somente SELECT)</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Mais recentes</CardTitle>
                <CardDescription>Últimos 8 com atividade</CardDescription>
              </CardHeader>
              <CardContent>
                {teamStats.topRecent.length === 0 && <p className="text-sm text-muted-foreground">Sem atividade recente.</p>}
                <ul className="divide-y">
                  {teamStats.topRecent.map(u => (
                    <li key={u.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.nome || u.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.ultimo_refresh ? new Date(u.ultimo_refresh).toLocaleString('pt-BR') : '—'}</p>
                      </div>
                      <Badge className={`${(u.status_presenca==='online'||u.online)?'bg-emerald-600':'bg-muted text-muted-foreground'} text-xs`}>
                        {(u.status_presenca==='online'||u.online)?'online':'offline'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <div className="hidden lg:block" />
          </div>
        </div>
      )}
  <Card className="max-w-sm border shadow-sm mt-2">
        <CardHeader className="py-3 px-4 space-y-1">
          <CardTitle className="text-sm font-semibold leading-tight">Meta</CardTitle>
          <CardDescription className="text-xs leading-snug">Progresso baseado em propostas implantadas</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 text-xs">
          {(() => {
            const DEFAULT_TARGET = 200000
            // users inclui gestores e analistas; consideraremos apenas analistas no agregado

            if (['gestor','gerente'].includes(currentUser.tipo_usuario)) {
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
                  {['gestor','gerente'].includes(currentUser.tipo_usuario) && (
                    <div className="bg-background border-b mb-4">
                      <div className="max-w-full px-4 py-3">
                        <Tabs value={activeDashTab} onValueChange={setActiveDashTab}>
                          <TabsList>
                            <TabsTrigger value="propostas">Propostas</TabsTrigger>
                            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
                            <TabsTrigger value="equipe">Equipe</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </div>
                  )}
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
        {(!['gestor','gerente'].includes(currentUser.tipo_usuario) || activeDashTab === 'propostas') && (
          <>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
            <span>Atualização automática a cada 30s</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-center">
        {['gestor','gerente'].includes(currentUser.tipo_usuario) && (
          <>
            <div className="col-span-1">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="mes">Este mês</SelectItem>
                  <SelectItem value="ano">Este ano</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
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
            <div className="col-span-1">
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
            <div className="col-span-1">
              <Select value={operadoraFilter} onValueChange={setOperadoraFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Filtrar operadora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as operadoras</SelectItem>
                  {operadoras.map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div className="col-span-1">
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
        <div className="col-span-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código ou CNPJ"
            className="h-8 pl-7 text-xs"
          />
        </div>
        <div className="col-span-1 flex gap-2">
          <button
            type="button"
            onClick={() => { setStatusFilter('todos'); setConsultorFilter('todos'); setVidasFilter('todos'); setOperadoraFilter('todas'); setPeriodFilter('todos'); setSearch('') }}
            className="text-xs px-2 py-1 border rounded-md hover:bg-muted"
            title="Limpar filtro"
          >
            Limpar
          </button>
        </div>
      </div>
      {activeFilters.length > 0 && (
        <div className="mt-2 flex items-center flex-wrap gap-2">
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
          </>
        )}

  {['gestor','gerente'].includes(currentUser.tipo_usuario) ? (
        activeDashTab === 'propostas' ? (
        <div className="space-y-8">
          {/* KPI header (macro) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Pipeline</span><TrendingUp className="w-4 h-4"/></div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(totalValue)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{totalProposals} propostas</div>
            </div>
            <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 ring-1 ring-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Implantado</span><Target className="w-4 h-4"/></div>
              <div className="mt-2 text-2xl font-semibold text-emerald-600">{formatCurrency(implantedValue)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{implantedProposals} propostas</div>
            </div>
            <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 ring-1 ring-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Conversão</span><ArrowUpDown className="w-4 h-4"/></div>
              <div className="mt-2 text-2xl font-semibold text-blue-600">{conversionPerc.toFixed(0)}%</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{implantedProposals}/{totalProposals} implantadas</div>
            </div>
            <div className="rounded-2xl p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 ring-1 ring-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Vidas</span><FileText className="w-4 h-4"/></div>
              <div className="mt-2 text-2xl font-semibold text-purple-600">{totalLives}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Total nas propostas</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Evolução (7 dias)</CardTitle>
                <CardDescription>Propostas criadas vs implantadas</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ created:{ label:'Criadas', color:'hsl(var(--primary))' }, implanted:{ label:'Implantadas', color:'hsl(var(--accent))' } }}>
                  <RLineChart data={evolution7d} margin={{ left: 12, right: 12, top: 6, bottom: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} width={24} tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="created" stroke="var(--color-created)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="implanted" stroke="var(--color-implanted)" strokeWidth={2} dot={false} />
                  </RLineChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Status das Propostas</CardTitle>
                <CardDescription>Distribuição (filtrada)</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ count:{ label:'Qtde', color:'hsl(var(--primary))' } }}>
                  <RBarChart data={statusCounts} margin={{ left: 8, right: 8, top: 6, bottom: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} width={24} tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[3,3,0,0]} />
                  </RBarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Operadoras (Top 5)</CardTitle>
                <CardDescription>Participação por volume</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <RPieChart>
                    <Pie data={topOperadorasPie} dataKey="value" nameKey="name" innerRadius={38} outerRadius={60} paddingAngle={3}>
                      {topOperadorasPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </RPieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Micro (unitário) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Últimas Propostas</CardTitle>
                <CardDescription>Já considerando os filtros aplicados</CardDescription>
              </CardHeader>
              <CardContent>
                {latestProposals.length===0 && <p className="text-sm text-muted-foreground">Sem propostas.</p>}
                <ul className="divide-y">
                  {latestProposals.map(p => (
                    <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.codigo || p.id?.slice(0,8)}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.consultor || '—'} • {new Date(p.criado_em).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs capitalize">{p.status}</Badge>
                        {p.valor ? <Badge variant="outline" className="text-xs">{formatCurrency(p.valor)}</Badge> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Movimentações Atrasadas</CardTitle>
                <CardDescription>Mais urgentes primeiro</CardDescription>
              </CardHeader>
              <CardContent>
                {overdueSolicitacoes.length===0 && <p className="text-sm text-muted-foreground">Sem atrasos.</p>}
                <ul className="space-y-2">
                  {overdueSolicitacoes.map(s => (
                    <li key={s.id} className="p-2 rounded-md border bg-card/40 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.codigo || s.id?.slice(0,8)}</p>
                        <p className="text-xs text-muted-foreground truncate capitalize">{s.status || 'aberta'}</p>
                      </div>
                      <Badge className="bg-red-600 text-white text-xs">SLA {new Date(s.sla_previsto).toLocaleString('pt-BR')}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
        ) : null
      ) : (
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
        </div>
      )}

      {/* Timeline de propostas para analista de implantação e movimentação; timeline de movimentações só para analista_movimentacao */}
      {['analista_implantacao', 'analista_movimentacao'].includes(currentUser.tipo_usuario) && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Linha do Tempo - Propostas</CardTitle>
              <CardDescription>Últimas movimentações das propostas que você acompanha</CardDescription>
            </CardHeader>
            <CardContent>
              {analystProposalTimeline.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma proposta ainda.</p>
              )}
              <ul className="space-y-3">
                {analystProposalTimeline.map(item => (
                  <li key={item.id} className="p-3 rounded-md border bg-card/50 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.status === 'implantado' ? 'bg-green-500' : item.atendido_por ? 'bg-blue-500' : 'bg-amber-500'}`} />
                      <div>
                        <p className="text-sm font-medium">{item.codigo}</p>
                        <p className="text-xs text-muted-foreground">Criado {formatDateTime(item.criado_em)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col md:items-end gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs capitalize">{item.status}</Badge>
                        {item.atendido_em && <Badge variant="outline" className="text-xs">Assumida {formatDateTime(item.atendido_em)}</Badge>}
                        {item.implantado && <Badge className="text-xs bg-green-600 text-white">Implantado</Badge>}
                        {item.valor ? <Badge variant="outline" className="text-xs">{formatCurrency(item.valor)}</Badge> : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {currentUser.tipo_usuario === 'analista_movimentacao' && (
            <Card>
              <CardHeader>
                <CardTitle>Linha do Tempo - Movimentações</CardTitle>
                <CardDescription>Últimas movimentações que você abriu ou assumiu</CardDescription>
              </CardHeader>
              <CardContent>
                {analystMovTimeline.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
                )}
                <ul className="space-y-3">
                  {analystMovTimeline.map(item => (
                    <li key={item.id} className="p-3 rounded-md border bg-card/50 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${movStatusColor(item.status)}`} />
                        <div>
                          <p className="text-sm font-medium">{item.codigo}</p>
                          <p className="text-xs text-muted-foreground">Criado {formatDateTime(item.criado_em)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col md:items-end gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs capitalize">{item.status}</Badge>
                          {item.atualizado_em && item.atualizado_em !== item.criado_em && (<Badge variant="outline" className="text-xs">Atualizado {formatDateTime(item.atualizado_em)}</Badge>)}
                          {item.tipo && <Badge variant="outline" className="text-xs capitalize">{item.tipo}{item.subtipo ? `/${item.subtipo}` : ''}</Badge>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

  {['gestor','gerente'].includes(currentUser.tipo_usuario) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
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
              <div className="flex justify-end">
                <div className="flex items-center gap-1 rounded-md border p-0.5 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setMacroMode('abs')}
                    className={`text-[10px] px-2 py-0.5 rounded-sm transition ${macroMode==='abs' ? 'bg-background shadow-sm font-medium' : 'opacity-60 hover:opacity-100'}`}
                  >ABS</button>
                  <button
                    type="button"
                    onClick={() => setMacroMode('perc')}
                    className={`text-[10px] px-2 py-0.5 rounded-sm transition ${macroMode==='perc' ? 'bg-background shadow-sm font-medium' : 'opacity-60 hover:opacity-100'}`}
                  >%</button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {statusCounts.map(({ status, count }) => {
                const percentage = totalProposals > 0 ? (count / totalProposals) * 100 : 0
                const widthAbs = maxStatusCount ? (count / maxStatusCount) * 100 : 0
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${getStatusBadgeClasses(status)}`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </div>
                      <div className="text-right font-medium tabular-nums text-[11px]">
                        {macroMode === 'abs' ? count : `${percentage.toFixed(1)}%`}
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div
                        className="h-2 bg-primary/80 transition-all"
                        style={{ width: `${macroMode==='abs' ? widthAbs : percentage}%` }}
                        title={`${status}: ${count} (${percentage.toFixed(1)}%)`}
                      />
                    </div>
                  </div>
                )
              })}
              {statusCounts.every(s=>s.count===0) && <p className="text-xs text-muted-foreground">Sem dados.</p>}
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
            <CardContent className="space-y-3">
              {topOperadoras.map(({ operadora, count, conv, implantadas }, idx) => {
                const percentage = totalProposals > 0 ? (count / totalProposals) * 100 : 0
                const widthAbs = maxOperadora ? (count / maxOperadora) * 100 : 0
                return (
                  <div key={operadora} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize truncate" title={operadora}>{idx+1}. {operadora}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-medium">{macroMode==='abs' ? count : `${percentage.toFixed(1)}%`}</span>
                        <Badge variant="outline" className="text-[10px]">{conv.toFixed(0)}%</Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div
                        className="h-2 bg-primary/60"
                        style={{ width: `${macroMode==='abs' ? widthAbs : percentage}%` }}
                        title={`${operadora}: ${count} (${percentage.toFixed(1)}%) / Conv ${conv.toFixed(1)}% (${implantadas} impl.)`}
                      />
                    </div>
                  </div>
                )
              })}
              {topOperadoras.length===0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
            </CardContent>
          </Card>

          {/* Aging */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Aging das Propostas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {agingBuckets.map(b => (
                <div key={b.key} className="space-y-1">
                  <div className="flex justify-between text-[11px]"><span>{b.label}</span><span className="tabular-nums">{b.count} ({b.perc.toFixed(1)}%)</span></div>
                  <div className="h-2 bg-muted rounded overflow-hidden"><div className="h-2 bg-primary/50" style={{ width: `${b.perc}%` }} /></div>
                </div>
              ))}
              {agingBuckets.every(b=>b.count===0) && <p className="text-xs text-muted-foreground">Sem propostas.</p>}
            </CardContent>
          </Card>

          {/* SLA Assunção */}
          <Card>
            <CardHeader><CardTitle className="text-lg">SLA de Assunção</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-[11px]">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground">Média</p><p className="font-semibold">{slaAssuncao.mediaH.toFixed(1)}h</p></div>
                <div><p className="text-muted-foreground">p95</p><p className="font-semibold">{slaAssuncao.p95H.toFixed(1)}h</p></div>
                <div><p className="text-muted-foreground">&lt;=8h</p><p className="font-semibold">{slaAssuncao.perc8.toFixed(0)}%</p></div>
                <div><p className="text-muted-foreground">&lt;=24h</p><p className="font-semibold">{slaAssuncao.perc24.toFixed(0)}%</p></div>
              </div>
              <div className="h-2 bg-muted rounded overflow-hidden" title="% assumidas em até 8h (verde) e até 24h (azul)">
                <div className="h-2 bg-emerald-500" style={{ width: `${Math.min(100,slaAssuncao.perc8)}%` }} />
                <div className="h-2 bg-blue-500 -mt-2 opacity-60" style={{ width: `${Math.min(100,slaAssuncao.perc24)}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">Base: {slaAssuncao.total} propostas assumidas.</p>
            </CardContent>
          </Card>
          {/* Forecast */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Forecast Meta</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-[11px]">
              {(() => {
                if (!forecastMeta) return <p className="text-xs text-muted-foreground">Somente gestor.</p>
                return (
                  <>
                    <div className="flex justify-between"><span>Atual</span><span className="font-medium">{formatCurrency(forecastMeta.valorTotalImplantado)}</span></div>
                    <div className="flex justify-between"><span>Média/dia</span><span>{formatCurrency(forecastMeta.mediaDia)}</span></div>
                    <div className="flex justify-between"><span>Proj. Fim</span><span className="font-medium">{formatCurrency(forecastMeta.projecao)}</span></div>
                    <div className="flex justify-between"><span>Meta Total</span><span>{formatCurrency(forecastMeta.totalTarget)}</span></div>
                    <div className="flex justify-between"><span>% Atual</span><span>{forecastMeta.percAtual.toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span>% Proj.</span><span>{forecastMeta.percProj.toFixed(1)}%</span></div>
                    <div className="h-2 bg-muted rounded overflow-hidden" title="Progresso atual vs projetado">
                      <div className="h-2 bg-primary/60" style={{ width: `${Math.min(100, forecastMeta.percAtual)}%` }} />
                      <div className="h-2 bg-accent/60 -mt-2" style={{ width: `${Math.min(100, forecastMeta.percProj)}%` }} />
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}
  {['gestor','gerente'].includes(currentUser.tipo_usuario) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {/* Evolução 7 dias */}
          <Card>
            <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg flex items-center gap-2"><Activity className="w-4 h-4" /> Evolução 7 dias</CardTitle></div></CardHeader>
            <CardContent className="space-y-2">
              {(() => { const max=evolution7d.reduce((m,d)=>Math.max(m,d.created,d.implanted),0); if(!max) return <p className="text-xs text-muted-foreground">Sem dados.</p>; const w=180,h=60,p=4; const sx=i=>p+(i/(evolution7d.length-1))*(w-2*p); const sy=v=> h-p-(max?(v/max)*(h-2*p):0); const line=(field,color)=>{ const pts=evolution7d.map((d,i)=>`${sx(i)},${sy(d[field])}`).join(' '); return <polyline key={field} points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /> }; return (<div className="flex flex-col items-start"><svg width={w} height={h} className="overflow-visible mb-2">{line('created','var(--primary)')}{line('implanted','var(--accent)')}</svg><div className="flex gap-3 text-[10px] text-muted-foreground"><span><span className="inline-block w-2 h-2 rounded-full bg-primary mr-1"/>Criadas</span><span><span className="inline-block w-2 h-2 rounded-full bg-accent mr-1"/>Implantadas</span></div><div className="grid grid-cols-7 gap-1 w-full text-[9px] mt-2">{evolution7d.map(d=> <span key={d.date} className="text-center truncate" title={d.date}>{d.date.slice(5)}</span>)}</div></div>) })()}
            </CardContent>
          </Card>
          {/* Faixas Valor */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Faixas de Valor</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-[11px]">{valueBuckets.map(b=> (<div key={b.label} className="space-y-1"><div className="flex justify-between"><span>{b.label}</span><span className="tabular-nums">{b.count} ({b.perc.toFixed(1)}%)</span></div><div className="h-2 bg-muted rounded overflow-hidden"><div className="h-2 bg-primary/40" style={{ width: `${b.perc}%` }}/></div></div>))}{valueBuckets.every(b=>b.count===0)&& <p className="text-xs text-muted-foreground">Sem propostas.</p>}</CardContent>
          </Card>
          {/* Ranking Analistas (reciclado) */}
          <Card>
            <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg flex items-center gap-2"><Award className="w-4 h-4" /> Ranking Analistas</CardTitle></div></CardHeader>
            <CardContent className="space-y-2">{analystRanking.length===0 && <p className="text-xs text-muted-foreground">Sem propostas assumidas.</p>}{analystRanking.map((a,idx)=>{ const medalClass= idx===0?'bg-yellow-400 text-black': idx===1?'bg-gray-300 text-black': idx===2?'bg-amber-600 text-white':'bg-muted text-muted-foreground'; const convPerc=a.conversao||0; return (<div key={a.id} className="space-y-1 p-2 border rounded-md bg-card/40"><div className="flex items-center justify-between gap-2 text-xs"><div className="flex items-center gap-2 min-w-0"><span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${medalClass}`}>{idx+1}</span><span className="font-medium truncate" title={a.nome}>{a.nome}</span></div><div className="flex items-center gap-2 flex-shrink-0"><Badge variant="outline" className="text-[10px]">{a.slaHoras.toFixed(1)}h SLA</Badge><Badge className="bg-blue-600 text-white text-[10px]">{formatCurrency(a.valorImplantado)}</Badge></div></div><div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>{a.implantadas}/{a.assumidas} implantadas</span><span>{convPerc.toFixed(0)}% conv.</span></div><div className="h-1.5 bg-muted rounded overflow-hidden"><div className="h-1.5 bg-emerald-500" style={{ width: `${Math.min(100,convPerc)}%` }} /></div></div>) })}</CardContent>
          </Card>
          {/* Espaço reservado (já temos Forecast e Ranking) */}
        </div>
      )}

  {['gestor','gerente'].includes(currentUser.tipo_usuario) && activeDashTab === 'movimentacoes' && movStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Movimentações</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{movStats.total}</div>
              <p className="text-xs text-muted-foreground">Total cadastradas</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abertas / Andamento</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{movStats.abertas + movStats.andamento}</div>
              <p className="text-xs text-muted-foreground">{movStats.abertas} abertas · {movStats.andamento} em execução</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{movStats.concluidas}</div>
              <p className="text-xs text-muted-foreground">{movStats.canceladas} canceladas</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{movStats.atrasadas}</div>
              <p className="text-xs text-muted-foreground">{movStats.pctAtrasadas.toFixed(1)}% do total</p>
            </CardContent>
          </Card>
        </div>
    )}
  {['gestor','gerente'].includes(currentUser.tipo_usuario) && activeDashTab === 'movimentacoes' && movStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Status Movimentações</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(() => {
                const list = []
                if (movStats.total) {
                  const push = (label, count) => { const perc = movStats.total? (count/movStats.total)*100:0; list.push({label,count,perc}) }
                  push('aberta', movStats.abertas)
                  push('em validação/execução', movStats.andamento)
                  push('concluída', movStats.concluidas)
                  push('cancelada', movStats.canceladas)
                }
                return list.length ? list.map(i => (
                  <div key={i.label} className="space-y-1">
                    <div className="flex justify-between text-[11px]"><span className="capitalize">{i.label}</span><span className="tabular-nums">{i.count} ({i.perc.toFixed(1)}%)</span></div>
                    <div className="h-2 bg-muted rounded overflow-hidden"><div className="h-2 bg-orange-500/70" style={{ width: `${i.perc}%` }} /></div>
                  </div>
                )) : <p className="text-xs text-muted-foreground">Sem dados.</p>
              })()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">SLA Assunção Mov.</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-[11px]">
              <div className="flex justify-between"><span>Média</span><span className="font-medium">{movStats.slaAssuncaoH.toFixed(1)}h</span></div>
              <div className="h-2 bg-muted rounded overflow-hidden" title="Média assunção (horas)"><div className="h-2 bg-amber-500" style={{ width: `${Math.min(100,(movStats.slaAssuncaoH/24)*100)}%` }} /></div>
              <p className="text-[10px] text-muted-foreground">Base: {movStats.total} solicitações.</p>
            </CardContent>
          </Card>
          <div className="hidden lg:block" />
          <div className="hidden lg:block" />
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
