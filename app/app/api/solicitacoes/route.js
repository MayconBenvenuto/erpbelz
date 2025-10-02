import { NextResponse } from 'next/server'
import { cacheJson } from '@/lib/api-helpers'
import { verifyToken, sanitizeInput, sanitizeForLog, checkRateLimit } from '@/lib/security'
import { supabase } from '@/lib/api-helpers'

function extractToken(req) {
  let token = null
  const auth = req.headers.get('authorization')
  if (auth && auth.startsWith('Bearer ')) token = auth.replace('Bearer ', '')
  if (!token) {
    const cookieHeader = req.headers.get('cookie') || ''
    const match = cookieHeader.split(/;\s*/).find(c => c.startsWith('crm_auth='))
    if (match) token = decodeURIComponent(match.split('=')[1] || '')
  }
  return token
}

export async function GET(req) {
  try {
    const token = extractToken(req)
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ message: 'Token inválido' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)
    const fields = (searchParams.get('fields') || '').trim()
    const columns = fields === 'list'
      ? 'id,codigo,tipo,subtipo,razao_social,cnpj,apolice_da_belz,acesso_empresa,operadora,observacoes,sla_previsto,status,atendido_por,criado_por,criado_em,atualizado_em'
      : '*'
  const onlyOverdue = ['1','true','yes'].includes(String(searchParams.get('atrasadas')||'').toLowerCase())
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
  const todayISO = new Date().toISOString().slice(0,10)

    let data = []
    let count = 0
    let error = null
    if (user.tipo === 'gestor' || user.tipo === 'gerente') {
      let q = supabase.from('solicitacoes').select(columns, { count: 'exact' })
      if (onlyOverdue) {
        q = q.not('sla_previsto','is', null).lt('sla_previsto', todayISO).neq('status','concluída').neq('status','cancelada')
      }
      const r = await q.order('codigo', { ascending: true }).range(from, to)
      data = r.data || []; count = r.count || 0; error = r.error
    } else if (user.tipo === 'consultor') {
      let q = supabase.from('solicitacoes').select(columns, { count: 'exact' }).eq('criado_por', user.userId)
      if (onlyOverdue) {
        q = q.not('sla_previsto','is', null).lt('sla_previsto', todayISO).neq('status','concluída').neq('status','cancelada')
      }
      const r = await q.order('codigo', { ascending: true }).range(from, to)
      data = r.data || []; count = r.count || 0; error = r.error
    } else if (user.tipo === 'analista_movimentacao') {
      // Unassigned + assigned to me
      let q1 = supabase.from('solicitacoes').select(columns).is('atendido_por', null)
      let q2 = supabase.from('solicitacoes').select(columns).eq('atendido_por', user.userId)
      if (onlyOverdue) {
        q1 = q1.not('sla_previsto','is', null).lt('sla_previsto', todayISO).neq('status','concluída').neq('status','cancelada')
        q2 = q2.not('sla_previsto','is', null).lt('sla_previsto', todayISO).neq('status','concluída').neq('status','cancelada')
      }
      const r1 = await q1
      const r2 = await q2
      error = r1.error || r2.error
      const map = new Map()
      ;[...(r1.data||[]), ...(r2.data||[])].forEach(s => map.set(s.id, s))
      const arr = Array.from(map.values()).sort((a,b)=> (a.codigo||'') > (b.codigo||'') ? 1 : -1)
      count = arr.length
      data = arr.slice(from, to+1)
    } else if (user.tipo === 'analista_implantacao') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }
    if (error) throw error
    // Enriquecer com nome/email do criador para exibição antes de assumir
    const userIds = Array.from(new Set(data.map(d => d.criado_por).filter(Boolean)))
    if (userIds.length) {
      try {
        const { data: usuarios } = await supabase.from('usuarios').select('id,nome,email').in('id', userIds)
        const map = new Map((usuarios||[]).map(u => [u.id, u]))
        data.forEach(d => {
          const u = map.get(d.criado_por)
          if (u) { d.criado_por_nome = u.nome; d.criado_por_email = u.email }
        })
      } catch(_) {}
    }
  // Cache privado curto para suavizar trocas de aba e rolagem (ETag condicional)
  const origin = req.headers.get('origin')
  return cacheJson(req, origin, { data, page, pageSize, total: count }, { maxAge: 45, swr: 180 })
  } catch (e) {
    console.error('Erro GET solicitacoes', sanitizeForLog(e))
    return NextResponse.json({ message: 'Erro ao listar' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
  const token = extractToken(req)
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
  const user = verifyToken(token)
    if (!user) return NextResponse.json({ message: 'Token inválido' }, { status: 401 })

    const rlKey = `post:solicitacao:${user.userId}`
    if (!checkRateLimit(rlKey)) {
      return NextResponse.json({ message: 'Muitas requisições' }, { status: 429 })
    }

    const body = await req.json()
    const required = ['tipo', 'razao_social', 'cnpj', 'apolice_da_belz']
    for (const r of required) {
      if (body[r] === undefined || body[r] === null || body[r] === '') {
        return NextResponse.json({ message: `Campo obrigatório: ${r}` }, { status: 400 })
      }
    }

    if (body.tipo === 'inclusao' && !['funcionario', 'socio', 'dependente'].includes(body.subtipo || '')) {
      return NextResponse.json({ message: 'Subtipo inválido para inclusão' }, { status: 400 })
    }
    if (body.tipo !== 'inclusao') body.subtipo = null

    const clean = v => (typeof v === 'string' ? sanitizeInput(v.trim()) : v)
    let slaPrevisto = null
    if (body.sla_previsto) {
      const d = new Date(body.sla_previsto)
      if (isNaN(d.getTime())) return NextResponse.json({ message: 'sla_previsto inválido' }, { status: 400 })
      slaPrevisto = d.toISOString().slice(0,10)
    }
    // Validação básica dos arquivos (se existirem)
    const safePath = (p) => typeof p === 'string' && !p.startsWith('/') && !p.includes('..') && p.length < 200
    const arquivosSan = (Array.isArray(body.arquivos) ? body.arquivos : []).filter(a => a && safePath(a.path || ''))

    const payload = {
      tipo: clean(body.tipo),
      subtipo: body.subtipo ? clean(body.subtipo) : null,
      razao_social: clean(body.razao_social),
      cnpj: clean(body.cnpj),
      apolice_da_belz: !!body.apolice_da_belz,
      acesso_empresa: clean(body.acesso_empresa || ''),
      operadora: clean(body.operadora || ''),
      observacoes: clean(body.observacoes || ''),
      arquivos: arquivosSan,
  dados: body.dados || {},
  criado_por: user.userId,
  sla_previsto: slaPrevisto,
  status: 'aberta',
  historico: [{ status: 'aberta', em: new Date().toISOString(), usuario_id: user.userId }]
    }

  const { data, error } = await supabase.from('solicitacoes').insert(payload).select().single()
    if (error) {
      // Fallback: tenta inserir sem colunas novas se erro de coluna inexistente (migração não aplicada)
      const msg = String(error.message || '').toLowerCase()
      if (/column \"status\"|column \"sla_previsto\"|column \"historico\"/.test(msg)) {
        const legacyPayload = { ...payload }
        delete legacyPayload.status
        delete legacyPayload.sla_previsto
        delete legacyPayload.historico
        const { data: legacyData, error: legacyErr } = await supabase.from('solicitacoes').insert(legacyPayload).select().single()
        if (legacyErr) {
          return NextResponse.json({ message: 'Erro ao criar (migração ausente?)', detalhe: legacyErr.message }, { status: 500 })
        }
        return NextResponse.json({ message: 'Solicitação criada (modo legado - aplique migração 20250822_add_solicitacoes_table.sql)', data: legacyData, aviso: 'Migração solicitacoes não aplicada' }, { status: 201 })
      }
      throw error
    }
    return NextResponse.json({ message: 'Solicitação criada', data }, { status: 201 })
  } catch (e) {
    console.error('Erro POST solicitacoes', sanitizeForLog({ message: e?.message, stack: e?.stack }))
    return NextResponse.json({ message: 'Erro ao criar', detalhe: e?.message }, { status: 500 })
  }
}
