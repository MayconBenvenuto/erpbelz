import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'

export const runtime = 'nodejs'
const BUCKET = 'docs_clientes'
const ALLOWED_MIME = [
  'application/pdf','image/jpeg','image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel','text/csv','application/csv'
]
const MAX_SIZE = 7 * 1024 * 1024

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  const user = auth.user
  try {
    const form = await request.formData()
    const file = form.get('file')
    const clienteId = form.get('cliente_id')
    if (!file || typeof file === 'string') return handleCORS(NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 }), origin)
    if (!clienteId) return handleCORS(NextResponse.json({ error: 'cliente_id obrigatório' }, { status: 400 }), origin)

    // Verifica ownership (consultor só acessa seus clientes)
    const { data: cliente } = await supabase.from('clientes_consultor').select('id, consultor_id').eq('id', clienteId).single()
    if (!cliente) return handleCORS(NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 }), origin)
    if (user.tipo_usuario === 'consultor' && cliente.consultor_id !== user.id) {
      return handleCORS(NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), origin)
    }

    if (file.size > MAX_SIZE) return handleCORS(NextResponse.json({ error: 'Arquivo excede 7MB' }, { status: 400 }), origin)
    if (file.type && !ALLOWED_MIME.includes(file.type)) return handleCORS(NextResponse.json({ error: 'Tipo não permitido' }, { status: 415 }), origin)
    const original = file.name || 'documento'
    const safeName = original.replace(/[^a-zA-Z0-9_.-]/g,'_')
    const path = `${clienteId}/${Date.now()}_${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buffer, { upsert: false, contentType: file.type || undefined })
    if (upErr) return handleCORS(NextResponse.json({ error: 'Falha upload', detalhe: upErr.message }), { status: 500 })
    const { data: pub } = await supabase.storage.from(BUCKET).getPublicUrl(path)
    return handleCORS(NextResponse.json({ path, url: pub?.publicUrl || null, nome: original, tipo: file.type || null }), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ error: 'Erro upload', detalhe: e?.message }), { status: 500 })
  }
}
