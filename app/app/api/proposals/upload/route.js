import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'
import { hasPermission } from '@/lib/rbac'

export const runtime = 'nodejs'

const ALLOWED_EXT = ['pdf','jpg','jpeg','png','xls','xlsx','csv']
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg','image/png',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv','application/csv'
]

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  if (!hasPermission(auth.user,'uploadPropostaDocs')) {
    return handleCORS(NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), origin)
  }
  try {
    const form = await request.formData()
    const file = form.get('file')
    const propostaId = form.get('proposta_id')
    const codigo = form.get('codigo') // opcional para path amigável
    const categoria = String(form.get('categoria') || 'geral').toLowerCase().replace(/[^a-z0-9_-]/g,'_')
    if (!file || typeof file === 'string') {
      return handleCORS(NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 }), origin)
    }
    if (!propostaId) {
      return handleCORS(NextResponse.json({ error: 'proposta_id obrigatório' }, { status: 400 }), origin)
    }
    // Verifica se proposta é acessível ao usuário (reuse select básico)
    const { data: proposta } = await supabase.from('propostas').select('id, criado_por, atendido_por, codigo').eq('id', propostaId).single()
    if (!proposta) return handleCORS(NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 }), origin)
    // Revalida permissão de visualizar proposta (mínimo)
    if (!hasPermission(auth.user,'viewPropostas')) return handleCORS(NextResponse.json({ error: 'Sem permissão' }, { status: 403 }), origin)

    const original = file.name || 'documento'
    const ext = (original.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_EXT.includes(ext)) {
      return handleCORS(NextResponse.json({ error: 'Extensão não permitida' }, { status: 415 }), origin)
    }
    const mime = file.type || ''
    if (mime && !ALLOWED_MIME.includes(mime)) {
      // Permite alguns navegadores enviarem mime vazio; somente bloqueia se informado inválido
      return handleCORS(NextResponse.json({ error: 'MIME type não permitido' }, { status: 415 }), origin)
    }
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const safeCodigo = (codigo || proposta.codigo || proposta.id).replace(/[^A-Z0-9_-]/gi,'')
    const path = `proposta_${safeCodigo}/${categoria}/${Date.now()}_${original.replace(/[^a-zA-Z0-9_.-]/g,'_')}`
    const { error: upErr } = await supabase.storage.from('implantacao_upload').upload(path, buffer, { upsert: false, contentType: mime || undefined })
    if (upErr) {
      return handleCORS(
        NextResponse.json({ error: 'Falha no upload', detalhe: upErr.message }, { status: 500 }),
        origin
      )
    }
    const { data: pub } = await supabase.storage.from('implantacao_upload').getPublicUrl(path)
    return handleCORS(NextResponse.json({ path, publicUrl: pub?.publicUrl || null }), origin)
  } catch (e) {
    return handleCORS(
      NextResponse.json({ error: 'Erro no upload', detalhe: e?.message }, { status: 500 }),
      origin
    )
  }
}
