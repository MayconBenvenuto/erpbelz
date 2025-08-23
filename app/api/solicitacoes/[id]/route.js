import { NextResponse } from 'next/server'
import { verifyToken, sanitizeForLog, sanitizeInput } from '@/lib/security'
import { supabase } from '@/lib/api-helpers'
import { SOLICITACAO_STATUS } from '@/lib/constants'

const STORAGE_BUCKET = 'movimentacao_upload'

export async function GET(req, { params }) {
  try {
    // auth (mesma lógica do PATCH)
    let token = null
    const auth = req.headers.get('authorization')
    if (auth && auth.startsWith('Bearer ')) token = auth.replace('Bearer ', '')
    if (!token) {
      const cookieHeader = req.headers.get('cookie') || ''
      const match = cookieHeader.split(/;\s*/).find(c => c.startsWith('crm_auth='))
      if (match) token = decodeURIComponent(match.split('=')[1] || '')
    }
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ message: 'Token inválido' }, { status: 401 })

    const id = params.id
    if (!id) return NextResponse.json({ message: 'ID ausente' }, { status: 400 })

    const { data, error } = await supabase.from('solicitacoes').select('*').eq('id', id).single()
    if (error || !data) return NextResponse.json({ message: 'Não encontrado' }, { status: 404 })

    // autorização
    const isGestor = user.tipo === 'gestor'
    const isAnalistaAutorizado = user.tipo === 'analista' && data.atendido_por === user.userId
    const isConsultorProprietario = user.tipo === 'consultor' && data.criado_por === user.userId
    if (!(isGestor || isAnalistaAutorizado || isConsultorProprietario)) {
      return NextResponse.json({ message: 'Sem permissão para ver detalhes' }, { status: 403 })
    }

    // garantir URLs de download (gera assinada se necessário)
    const arquivos = Array.isArray(data.arquivos) ? data.arquivos : []
    const enriched = []
    for (const arq of arquivos) {
      if (arq?.url) { enriched.push(arq); continue }
      const path = arq?.path
      if (!path) { enriched.push(arq); continue }
      try {
        const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 600)
        enriched.push({ ...arq, url: signed?.signedUrl || arq.url || null, signed: true })
      } catch {
        enriched.push(arq)
      }
    }
    data.arquivos = enriched
    return NextResponse.json({ data })
  } catch (e) {
    console.error('Erro GET solicitacao', sanitizeForLog(e))
    return NextResponse.json({ message: 'Erro ao carregar' }, { status: 500 })
  }
}

export async function PATCH(req, { params }) {
  try {
    let token = null
    const auth = req.headers.get('authorization')
    if (auth && auth.startsWith('Bearer ')) token = auth.replace('Bearer ', '')
    if (!token) {
      const cookieHeader = req.headers.get('cookie') || ''
      const match = cookieHeader.split(/;\s*/).find(c => c.startsWith('crm_auth='))
      if (match) token = decodeURIComponent(match.split('=')[1] || '')
    }
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ message: 'Token inválido' }, { status: 401 })

    const id = params.id
    if (!id) return NextResponse.json({ message: 'ID ausente' }, { status: 400 })
    const body = await req.json().catch(() => ({}))

    const updates = {}
    const historicoAppend = []

    if (body.claim) {
      if (user.tipo !== 'analista') {
        return NextResponse.json({ message: 'Somente analistas podem assumir' }, { status: 403 })
      }
      const { data: cur } = await supabase.from('solicitacoes').select('atendido_por').eq('id', id).single()
      if (cur?.atendido_por && cur.atendido_por !== user.userId) {
        return NextResponse.json({ message: 'Já atribuída a outro analista' }, { status: 409 })
      }
      // obter nome analista
      let nome = null
      try {
        const { data: usr } = await supabase.from('usuarios').select('nome').eq('id', user.userId).single()
        nome = usr?.nome || null
      } catch {}
      updates.atendido_por = user.userId
      updates.atendido_por_nome = nome
      historicoAppend.push({ status: 'atribuída', em: new Date().toISOString(), usuario_id: user.userId })
    }
    if (body.status) {
      if (user.tipo !== 'analista') {
        return NextResponse.json({ message: 'Somente analistas podem alterar status' }, { status: 403 })
      }
      const statusLimpo = sanitizeInput(String(body.status).toLowerCase())
      // manter capitalização padrão da lista
      const match = SOLICITACAO_STATUS.find(s => s.toLowerCase() === statusLimpo)
      if (!match) return NextResponse.json({ message: 'Status inválido' }, { status: 400 })
      updates.status = match
      historicoAppend.push({ status: match, em: new Date().toISOString(), usuario_id: user.userId })
    }
    if (body.sla_previsto) {
      const d = new Date(body.sla_previsto)
      if (isNaN(d.getTime())) return NextResponse.json({ message: 'Data SLA inválida' }, { status: 400 })
      updates.sla_previsto = d.toISOString().slice(0, 10)
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'Nada para atualizar' }, { status: 400 })
    }

    // append historico no lado do servidor para evitar race conditions
    const { data: current, error: fetchErr } = await supabase.from('solicitacoes').select('historico').eq('id', id).single()
    if (fetchErr) return NextResponse.json({ message: 'Registro inexistente' }, { status: 404 })
    const novoHistorico = Array.isArray(current?.historico) ? [...current.historico, ...historicoAppend] : historicoAppend
    updates.historico = novoHistorico

    const { data, error } = await supabase.from('solicitacoes').update(updates).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json({ message: 'Atualizado', data })
  } catch (e) {
    console.error('Erro PATCH solicitacao', sanitizeForLog(e))
    return NextResponse.json({ message: 'Erro ao atualizar' }, { status: 500 })
  }
}
