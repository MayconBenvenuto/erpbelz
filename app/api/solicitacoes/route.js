import { NextResponse } from 'next/server'
import { verifyToken, sanitizeInput, sanitizeForLog } from '@/lib/security'
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
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let data = []
    let count = 0
    let error = null
    if (user.tipo === 'gestor') {
      const r = await supabase.from('solicitacoes').select('*', { count: 'exact' }).order('codigo', { ascending: true }).range(from, to)
      data = r.data || []; count = r.count || 0; error = r.error
    } else if (user.tipo === 'consultor') {
      const r = await supabase.from('solicitacoes').select('*', { count: 'exact' }).eq('criado_por', user.userId).order('codigo', { ascending: true }).range(from, to)
      data = r.data || []; count = r.count || 0; error = r.error
    } else if (user.tipo === 'analista') {
      // Unassigned + assigned to me
      const r1 = await supabase.from('solicitacoes').select('*').is('atendido_por', null)
      const r2 = await supabase.from('solicitacoes').select('*').eq('atendido_por', user.userId)
      error = r1.error || r2.error
      const map = new Map()
      ;[...(r1.data||[]), ...(r2.data||[])].forEach(s => map.set(s.id, s))
      const arr = Array.from(map.values()).sort((a,b)=> (a.codigo||'') > (b.codigo||'') ? 1 : -1)
      count = arr.length
      data = arr.slice(from, to+1)
    }
    if (error) throw error
    return NextResponse.json({ data, page, pageSize, total: count })
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
    const payload = {
      tipo: clean(body.tipo),
      subtipo: body.subtipo ? clean(body.subtipo) : null,
      razao_social: clean(body.razao_social),
      cnpj: clean(body.cnpj),
      apolice_da_belz: !!body.apolice_da_belz,
      acesso_empresa: clean(body.acesso_empresa || ''),
      operadora: clean(body.operadora || ''),
      observacoes: clean(body.observacoes || ''),
      arquivos: Array.isArray(body.arquivos) ? body.arquivos : [],
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
