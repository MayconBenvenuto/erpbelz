import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'

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

  const { searchParams } = new URL(request.url)
  const spStart = searchParams.get('start')
  const spEnd = searchParams.get('end')
  const { start, end } = (isValidDateString(spStart) && isValidDateString(spEnd)) ? { start: spStart, end: spEnd } : monthRange()

  // Busca propostas do período
  const { data: props, error } = await supabase
    .from('propostas')
    .select('id, criado_em, status, valor, quantidade_vidas, operadora, consultor, criado_por, codigo')
    .gte('criado_em', start)
    .lt('criado_em', new Date(new Date(end).getTime() + 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    return handleCORS(NextResponse.json({ message: 'Erro ao carregar métricas', detail: error.message }, { status: 400 }), origin)
  }

  const proposals = (props || []).filter(p => p && p.criado_em && p.status)

  // Mapa de usuários (analistas)
  const userIds = Array.from(new Set(proposals.map(p => p.criado_por).filter(Boolean)))
  let usersMap = {}
  if (userIds.length) {
    const { data: users } = await supabase.from('usuarios').select('id, nome').in('id', userIds)
    usersMap = Object.fromEntries((users || []).map(u => [u.id, u.nome]))
  }

  // Funções auxiliares
  const sum = (arr, sel) => arr.reduce((acc, it) => acc + (Number(sel(it)) || 0), 0)
  const count = (arr, pred) => arr.reduce((acc, it) => acc + (pred(it) ? 1 : 0), 0)

  // KPIs gerais
  const totalPropostas = proposals.length
  const implantadasArr = proposals.filter(p => p.status === 'implantado')
  const implantadas = implantadasArr.length
  const ticketMedioGeral = implantadasArr.length ? (sum(implantadasArr, p => p.valor) / implantadasArr.length) : 0
  const vidasTotais = sum(proposals, p => p.quantidade_vidas)

  // Ranking por analista
  const byAnalista = {}
  for (const p of proposals) {
    const key = p.criado_por || '—'
    if (!byAnalista[key]) byAnalista[key] = { usuario_id: key, nome: usersMap[key] || '—', items: [] }
    byAnalista[key].items.push(p)
  }
  const rankingAnalistas = Object.values(byAnalista).map(r => {
    const items = r.items
    const total = items.length
    const impl = count(items, i => i.status === 'implantado')
    const valorTotal = sum(items, i => i.valor)
    const ticket = impl ? (sum(items.filter(i => i.status === 'implantado'), i => i.valor) / impl) : 0
    const vidas = sum(items, i => i.quantidade_vidas)
    const taxa = total ? Math.round((impl * 1000) / total) / 10 : 0
    return { usuario_id: r.usuario_id, nome: r.nome, total_propostas: total, implantadas: impl, taxa_implantacao: taxa, valor_total: valorTotal, ticket_medio: ticket, vidas_total: vidas }
  }).sort((a, b) => Number(b.valor_total) - Number(a.valor_total)).slice(0, 10)

  // Ranking por consultor
  const byConsultor = {}
  for (const p of proposals) {
    const key = p.consultor || '—'
    if (!byConsultor[key]) byConsultor[key] = { consultor: key, items: [] }
    byConsultor[key].items.push(p)
  }
  const rankingConsultores = Object.values(byConsultor).map(r => {
    const items = r.items
    const total = items.length
    const impl = count(items, i => i.status === 'implantado')
    const valorTotal = sum(items, i => i.valor)
    const ticket = impl ? (sum(items.filter(i => i.status === 'implantado'), i => i.valor) / impl) : 0
    const vidas = sum(items, i => i.quantidade_vidas)
    const taxa = total ? Math.round((impl * 1000) / total) / 10 : 0
    return { consultor: r.consultor, total_propostas: total, implantadas: impl, taxa_implantacao: taxa, valor_total: valorTotal, ticket_medio: ticket, vidas_total: vidas }
  }).sort((a, b) => Number(b.valor_total) - Number(a.valor_total)).slice(0, 10)

  // Funil por status
  const byStatus = {}
  for (const p of proposals) {
    const key = p.status || '—'
    if (!byStatus[key]) byStatus[key] = { status: key, total: 0, valor_total: 0 }
    byStatus[key].total += 1
    byStatus[key].valor_total += Number(p.valor || 0)
  }
  const funilStatus = Object.values(byStatus).sort((a, b) => b.total - a.total)

  // Vidas por operadora
  const byOperadora = {}
  for (const p of proposals) {
    const key = p.operadora || '—'
    if (!byOperadora[key]) byOperadora[key] = { operadora: key, vidas_total: 0, propostas: 0 }
    byOperadora[key].vidas_total += Number(p.quantidade_vidas || 0)
    byOperadora[key].propostas += 1
  }
  const vidasPorOperadora = Object.values(byOperadora).sort((a, b) => b.vidas_total - a.vidas_total)

  const result = {
    periodo: { start, end },
    kpis: {
      total_propostas: totalPropostas,
      implantadas,
      ticket_medio_geral: Math.round(ticketMedioGeral * 100) / 100,
      vidas_totais: vidasTotais,
    },
    rankingAnalistas,
    rankingConsultores,
    funilStatus,
    vidasPorOperadora,
  }

  return handleCORS(NextResponse.json(result, { status: 200 }), origin)
}
