import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { supabase, handleCORS, requireAuth, cacheJson } from '@/lib/api-helpers'
import { performance } from 'node:perf_hooks'

// Probabilidades para forecast ponderado por estágio
const STATUS_PROB = {
  'em análise': 0.05,
  'pendencias seguradora': 0.25,
  'pendente cliente': 0.25,
  'pleito seguradora': 0.4,
  'implantando': 0.7,
  'boleto liberado': 0.85,
  'negado': 0,
  'implantado': 1
}
const BACKLOG_CRITICO = new Set(['pendencias seguradora','pendente cliente'])
const SLA_IMPLANTACAO_DIAS = 30
const ESTAGNAÇÃO_DIAS = 10 // usada para "recuperação de estagnação"

function toISODate(d) {
  return new Date(d).toISOString().slice(0, 10)
}

function monthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: toISODate(start), end: toISODate(end) }
}

function isValidDateString(s) {
  if (!s || typeof s !== 'string') return false
  const d = new Date(s)
  return !isNaN(d.getTime())
}

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function GET(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }
  if (auth.user?.tipo_usuario !== 'gestor') {
    return handleCORS(NextResponse.json({ message: 'Acesso negado' }, { status: 403 }), origin)
  }

  const queryStarted = performance.now()
  const { searchParams } = new URL(request.url)
  const spStart = searchParams.get('start')
  const spEnd = searchParams.get('end')
  const { start, end } = (isValidDateString(spStart) && isValidDateString(spEnd)) ? { start: spStart, end: spEnd } : monthRange()
  const endInclusiveISO = new Date(new Date(end).getTime() + 24 * 60 * 60 * 1000).toISOString()

  // Busca propostas do período (criadas no range)
  const { data: props, error } = await supabase
    .from('propostas')
    .select('id, criado_em, status, valor, quantidade_vidas, operadora, consultor, consultor_email, criado_por, codigo')
    .gte('criado_em', start)
    .lt('criado_em', endInclusiveISO)

  if (error) {
    return handleCORS(NextResponse.json({ message: 'Erro ao carregar métricas', detail: error.message }, { status: 400 }), origin)
  }

  const proposals = (props || []).filter(p => p && p.criado_em && p.status)

  // Mapa de usuários (todos menos gestores para rankingUsuarios)
  const userIds = Array.from(new Set(proposals.map(p => p.criado_por).filter(Boolean)))
  const usersPromise = userIds.length
    ? supabase.from('usuarios').select('id, nome, email, tipo_usuario').in('id', userIds)
    : Promise.resolve({ data: [], error: null })
  const auditPromise = proposals.length
    ? supabase
        .from('propostas_auditoria')
        .select('proposta_id, changes, criado_em')
        .in('proposta_id', proposals.map(p => p.id))
        .gte('criado_em', start)
        .order('criado_em', { ascending: true })
    : Promise.resolve({ data: [], error: null })

  const [{ data: udata, error: usersError }, { data: auditsRaw, error: auditsError }] = await Promise.all([usersPromise, auditPromise])

  if (usersError) {
    return handleCORS(NextResponse.json({ message: 'Erro ao carregar usuários', detail: usersError.message }, { status: 400 }), origin)
  }
  if (auditsError) {
    return handleCORS(NextResponse.json({ message: 'Erro ao carregar auditoria', detail: auditsError.message }, { status: 400 }), origin)
  }

  const users = udata || []
  const usersById = Object.fromEntries((udata || []).map(u => [u.id, u]))

  // Funções auxiliares
  const sum = (arr, sel) => arr.reduce((acc, it) => acc + (Number(sel(it)) || 0), 0)
  const count = (arr, pred) => arr.reduce((acc, it) => acc + (pred(it) ? 1 : 0), 0)

  // --- Histórico de status (para métricas temporais) ---
  let statusHistory = []
  if (Array.isArray(auditsRaw) && auditsRaw.length) {
    statusHistory = auditsRaw.filter(a => a?.changes?.status && a.changes.status.after)
  }

  // Reconstrói timeline de status por proposta
  const timelineByProposal = {}
  for (const p of proposals) {
    timelineByProposal[p.id] = [{ status: 'em análise', at: new Date(p.criado_em) }] // assume status inicial
  }
  for (const row of statusHistory) {
    try {
      const after = row.changes.status.after
      timelineByProposal[row.proposta_id]?.push({ status: after, at: new Date(row.criado_em) })
    } catch {}
  }
  // Ordena cada timeline
  for (const k of Object.keys(timelineByProposal)) {
    timelineByProposal[k].sort((a,b) => a.at - b.at)
  }

  // KPIs gerais + avançados
  const totalPropostas = proposals.length
  const implantadasArr = proposals.filter(p => p.status === 'implantado')
  const implantadas = implantadasArr.length
  const valorImplantado = sum(implantadasArr, p => p.valor)
  const ticketMedioGeral = implantadasArr.length ? (valorImplantado / implantadasArr.length) : 0
  const ticketDesvioPadrao = (() => {
    if (!implantadasArr.length) return 0
    const media = ticketMedioGeral
    const variancia = implantadasArr.reduce((acc,p) => acc + Math.pow((Number(p.valor)||0)-media,2),0)/implantadasArr.length
    return Math.sqrt(variancia)
  })()
  const vidasTotais = sum(proposals, p => p.quantidade_vidas)
  const taxaConversaoFinal = totalPropostas ? +(implantadas * 100 / totalPropostas).toFixed(2) : 0

  // Lead time (criação -> primeira vez implantado)
  const leadTimes = implantadasArr.map(p => {
    const tl = timelineByProposal[p.id]
    const implEvt = tl?.find(e => e.status === 'implantado')
    if (!implEvt) return 0
    return (implEvt.at - new Date(p.criado_em)) / (1000*60*60*24)
  }).filter(n => n > 0)
  const leadTimeMedioDias = leadTimes.length ? +(leadTimes.reduce((a,b)=>a+b,0)/leadTimes.length).toFixed(2) : 0

  // Tempo até primeiro avanço
  const tempoPrimeiroAvanco = Object.values(timelineByProposal).map(tl => {
    if (tl.length < 2) return 0
    return (tl[1].at - tl[0].at)/(1000*60*60*24)
  }).filter(n=>n>0)
  const tempoPrimeiroAvancoMedio = tempoPrimeiroAvanco.length ? +(tempoPrimeiroAvanco.reduce((a,b)=>a+b,0)/tempoPrimeiroAvanco.length).toFixed(2) : 0

  // Aging atual (dias no status atual)
  const now = Date.now()
  const agingPorProposta = proposals.map(p => {
    const tl = timelineByProposal[p.id]
    const currentEvt = tl?.[tl.length-1]
    const dias = currentEvt ? Math.floor((now - currentEvt.at.getTime())/(1000*60*60*24)) : 0
    return { id: p.id, codigo: p.codigo, status: p.status, dias_no_status: dias, valor: Number(p.valor)||0 }
  })
  const agingMedioDias = agingPorProposta.length ? +(agingPorProposta.reduce((a,b)=>a + b.dias_no_status,0)/agingPorProposta.length).toFixed(2) : 0

  // SLA implantação (implantes dentro de SLA_IMPLANTACAO_DIAS dias)
  const implDentroSLA = leadTimes.filter(d => d <= SLA_IMPLANTACAO_DIAS).length
  const slaImplantacaoPct = implantadas ? +(implDentroSLA * 100 / implantadas).toFixed(2) : 0

  // Recuperação de estagnação: número de mudanças que ocorreram após período parado > ESTAGNAÇÃO_DIAS
  let recuperacoes = 0
  for (const tl of Object.values(timelineByProposal)) {
    for (let i=1;i<tl.length;i++) {
      const gap = (tl[i].at - tl[i-1].at)/(1000*60*60*24)
      if (gap > ESTAGNAÇÃO_DIAS) recuperacoes++
    }
  }

  // Retrabalho: % de propostas que retornam a um status anterior já visitado
  const retrabalhoFlags = Object.values(timelineByProposal).map(tl => {
    const seen = new Set()
    let rework = false
    for (const ev of tl) {
      if (seen.has(ev.status)) { rework = true; break }
      seen.add(ev.status)
    }
    return rework
  })
  const retrabalhoPct = retrabalhoFlags.length ? +(retrabalhoFlags.filter(Boolean).length * 100 / retrabalhoFlags.length).toFixed(2) : 0

  // Perdas
  const perdidasArr = proposals.filter(p => p.status === 'negado')
  const propostasNegadas = perdidasArr.length
  const taxaPerdaPct = (implantadas + propostasNegadas) ? +(propostasNegadas * 100 / (implantadas + propostasNegadas)).toFixed(2) : 0

  // Forecast ponderado
  const forecastValorPonderado = proposals.reduce((acc,p)=>acc + (Number(p.valor)||0)*(STATUS_PROB[p.status] ?? 0.1),0)

  // Run rate / previsão fim mês
  const hoje = new Date()
  const diasNoMesTotal = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).getDate()
  const diaAtual = hoje.getDate()
  const implantadasMes = implantadasArr.length
  const runRateImplantacao = diaAtual ? +(implantadasMes / diaAtual).toFixed(3) : 0
  const previsaoFimMesImplantadas = +(runRateImplantacao * diasNoMesTotal).toFixed(1)

  // Ranking por usuário (exclui gestores) - analistas + consultores que têm usuário
  const byUsuario = {}
  for (const p of proposals) {
    const uid = p.criado_por
    if (!uid) continue
    const user = usersById[uid]
    if (user?.tipo_usuario === 'gestor') continue
    if (!byUsuario[uid]) byUsuario[uid] = { usuario_id: uid, nome: user?.nome || '—', items: [] }
    byUsuario[uid].items.push(p)
  }
  const rankingUsuarios = Object.values(byUsuario).map(r => {
    const items = r.items
    const total = items.length
    const impl = count(items, i => i.status === 'implantado')
    const valorTotal = sum(items, i => i.valor)
    const ticket = impl ? (sum(items.filter(i => i.status === 'implantado'), i => i.valor) / impl) : 0
    const vidas = sum(items, i => i.quantidade_vidas)
    const taxa = total ? +(impl * 100 / total).toFixed(1) : 0
    return { usuario_id: r.usuario_id, nome: r.nome, total_propostas: total, implantadas: impl, taxa_implantacao: taxa, valor_total: valorTotal, ticket_medio: ticket, vidas_total: vidas }
  }).sort((a,b)=>Number(b.valor_total)-Number(a.valor_total)).slice(0,15)

  // Ranking por consultor (campo livre)
  const byConsultor = {}
  for (const p of proposals) {
    const key = p.consultor || '—'
    if (!byConsultor[key]) byConsultor[key] = { consultor: key, items: [] }
    byConsultor[key].items.push(p)
  }
  const rankingConsultores = Object.values(byConsultor).map(r=>{
    const items = r.items
    const total = items.length
    const impl = count(items,i=>i.status==='implantado')
    const valorTotal = sum(items,i=>i.valor)
    const ticket = impl ? (sum(items.filter(i=>i.status==='implantado'),i=>i.valor)/impl):0
    const vidas = sum(items,i=>i.quantidade_vidas)
    const taxa = total ? +(impl * 100 / total).toFixed(1) : 0
    return { consultor: r.consultor, total_propostas: total, implantadas: impl, taxa_implantacao: taxa, valor_total: valorTotal, ticket_medio: ticket, vidas_total: vidas }
  }).sort((a,b)=>Number(b.valor_total)-Number(a.valor_total)).slice(0,15)

  // Ranking consultores email (normalizado)
  const byConsultorEmail = {}
  for (const p of proposals) {
    const email = (p.consultor_email||'').trim().toLowerCase()
    if (!email) continue
    if (!byConsultorEmail[email]) byConsultorEmail[email] = { consultor_email: email, items: [] }
    byConsultorEmail[email].items.push(p)
  }
  const rankingConsultoresEmail = Object.values(byConsultorEmail).map(r=>{
    const items = r.items
    const total = items.length
    const impl = count(items,i=>i.status==='implantado')
    const valorTotal = sum(items,i=>i.valor)
    const ticket = impl ? (sum(items.filter(i=>i.status==='implantado'),i=>i.valor)/impl):0
    const vidas = sum(items,i=>i.quantidade_vidas)
    const taxa = total ? +(impl * 100 / total).toFixed(1) : 0
    // match user
    const usuarioMatch = users.find(u => (u.email||'').toLowerCase() === r.consultor_email)
    return { consultor_email: r.consultor_email, nome_usuario: usuarioMatch?.nome || null, total_propostas: total, implantadas: impl, taxa_implantacao: taxa, valor_total: valorTotal, ticket_medio: ticket, vidas_total: vidas }
  }).sort((a,b)=>Number(b.valor_total)-Number(a.valor_total)).slice(0,15)

  // Funil por status + porcentagem e valor
  const byStatus = {}
  for (const p of proposals) {
    const key = p.status || '—'
    if (!byStatus[key]) byStatus[key] = { status: key, total: 0, valor_total: 0 }
    byStatus[key].total += 1
    byStatus[key].valor_total += Number(p.valor || 0)
  }
  const funilStatus = Object.values(byStatus).map(s => ({ ...s, pct: totalPropostas ? +(s.total * 100 / totalPropostas).toFixed(2) : 0 }))
    .sort((a,b)=>b.total - a.total)

  // Pipeline por status (valor)
  const pipelineValor = funilStatus.map(s => ({ status: s.status, valor_total: s.valor_total }))

  // Aging ativo & backlog crítico
  const agingAtivo = agingPorProposta.sort((a,b)=>b.dias_no_status - a.dias_no_status).slice(0,50)
  const backlogCritico = agingPorProposta.filter(a => BACKLOG_CRITICO.has(a.status) && a.dias_no_status > ESTAGNAÇÃO_DIAS).sort((a,b)=>b.dias_no_status - a.dias_no_status).slice(0,30)

  // Série últimos 6 meses (usando criado_em para implantadas - nota: aproximação)
  const mesesSerie = []
  const base = new Date(start)
  const baseDate = new Date(base.getFullYear(), base.getMonth(), 1)
  for (let i=5;i>=0;i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth()-i, 1)
    const label = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    mesesSerie.push(label)
  }
  const serieImplantado = mesesSerie.map(m => {
    const [year, month] = m.split('-').map(Number)
    const startM = new Date(year, month-1, 1)
    const endM = new Date(year, month, 0)
    const implanted = proposals.filter(p => p.status==='implantado' && new Date(p.criado_em) >= startM && new Date(p.criado_em) <= endM)
    return { mes: m, implantadas: implanted.length, valor_implantado: sum(implantadasArr.filter(p => implanted.includes(p)), p=>p.valor) }
  })

  // Métricas derivadas de etapa (tempo médio por etapa)
  const tempoPorEtapa = (() => {
    const acc = {}
  for (const [, tl] of Object.entries(timelineByProposal)) {
      for (let i=0;i<tl.length-1;i++) {
        const cur = tl[i]
        const next = tl[i+1]
        const dias = (next.at - cur.at)/(1000*60*60*24)
        if (!acc[cur.status]) acc[cur.status] = { status: cur.status, totalDias: 0, transicoes: 0 }
        acc[cur.status].totalDias += dias
        acc[cur.status].transicoes += 1
      }
      // etapa atual (até agora)
      const last = tl[tl.length-1]
      const diasAtual = (now - last.at.getTime())/(1000*60*60*24)
      if (!acc[last.status]) acc[last.status] = { status: last.status, totalDias: 0, transicoes: 0 }
      // não conta transicao futura, mas podemos coletar para aging médio
      acc[last.status].totalDias += diasAtual
    }
    return Object.values(acc).map(e => ({ status: e.status, tempo_medio_dias: +(e.totalDias / (e.transicoes || 1)).toFixed(2) }))
  })()

  const kpis = {
    total_propostas: totalPropostas,
    implantadas,
    valor_implantado: valorImplantado,
    ticket_medio_geral: +ticketMedioGeral.toFixed(2),
    ticket_desvio_padrao: +ticketDesvioPadrao.toFixed(2),
    vidas_totais: vidasTotais,
    taxa_conversao_final: taxaConversaoFinal,
    lead_time_medio_dias: leadTimeMedioDias,
    tempo_medio_primeiro_avanco_dias: tempoPrimeiroAvancoMedio,
    aging_medio_dias: agingMedioDias,
    sla_implantacao_pct: slaImplantacaoPct,
    forecast_valor_ponderado: +forecastValorPonderado.toFixed(2),
    run_rate_implantacao: runRateImplantacao,
    previsao_fim_mes_implantadas: previsaoFimMesImplantadas,
    propostas_negadas: propostasNegadas,
    taxa_perda_pct: taxaPerdaPct,
    recuperacoes_estagnacao: recuperacoes,
    retrabalho_pct: retrabalhoPct
  }

  // Vidas por operadora
  const byOperadora = {}
  for (const p of proposals) {
    const key = p.operadora || '—'
    if (!byOperadora[key]) byOperadora[key] = { operadora: key, vidas_total: 0, propostas: 0 }
    byOperadora[key].vidas_total += Number(p.quantidade_vidas || 0)
    byOperadora[key].propostas += 1
  }
  const vidasPorOperadora = Object.values(byOperadora).sort((a, b) => b.vidas_total - a.vidas_total)

  const tookMs = Math.round(Math.max(performance.now() - queryStarted, 0))

  const result = {
    periodo: { start, end },
    kpis,
    funilStatus,
    pipelineValor,
    tempoPorEtapa,
    agingAtivo,
    backlogCritico,
    serieImplantado: serieImplantado,
    rankingUsuarios,
    rankingConsultores,
    rankingConsultoresEmail,
    vidasPorOperadora,
    meta_info: { sla_dias: SLA_IMPLANTACAO_DIAS, estagnacao_dias: ESTAGNAÇÃO_DIAS, prob_status: STATUS_PROB },
    meta: { took_ms: tookMs, total_propostas: totalPropostas }
  }

  if (tookMs) {
    try {
      // eslint-disable-next-line no-console
      console.info('[API][reports:performance]', {
        user: auth.user?.id || 'anon',
        periodo: { start, end },
        total_propostas: totalPropostas,
        took_ms: tookMs,
      })
    } catch {}
  }

  // Dashboard é consultado com frequência; aplicar cache privado com ETag
  return cacheJson(request, origin, result, { maxAge: 300, swr: 900, status: 200, headers: tookMs ? { 'X-Query-Duration-MS': tookMs } : undefined })
}
