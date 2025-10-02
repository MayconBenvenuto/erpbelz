import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'

const BUCKET = 'docs_clientes'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function GET(request) {
  const origin = request.headers.get('origin')
  const { searchParams } = new URL(request.url)
  const clienteId = searchParams.get('cliente_id')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  if (!clienteId) return handleCORS(NextResponse.json({ error: 'cliente_id obrigatório' }, { status: 400 }), origin)
  // analista_cliente permitido
  const user = auth.user
  try {
  // analista_cliente permitido
    const { data: cliente } = await supabase.from('clientes_consultor').select('id, consultor_id').eq('id', clienteId).single()
    if (!cliente) return handleCORS(NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 }), origin)
    if (user.tipo_usuario === 'consultor' && cliente.consultor_id !== user.id) return handleCORS(NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), origin)
    // Lista objetos (requer service role para recursive listing; se não tiver, fallback 403)
    const { data, error } = await supabase.storage.from(BUCKET).list(clienteId, { limit: 100, offset: 0 })
    if (error) return handleCORS(NextResponse.json({ error: 'Falha listar', detalhe: error.message }), { status: 500 })
    const enriched = await Promise.all((data || []).filter(f=>f.name).map(async f => {
      const path = `${clienteId}/${f.name}`
      const { data: pub } = await supabase.storage.from(BUCKET).getPublicUrl(path)
      return { path, nome: f.name, url: pub?.publicUrl || null, size: f.metadata?.size || null, updated_at: f.updated_at }
    }))
    return handleCORS(NextResponse.json(enriched), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ error: 'Erro listar docs' }, { status: 500 }), origin)
  }
}

export async function DELETE(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  const user = auth.user
  try {
    const body = await request.json().catch(()=>({}))
    const { path, cliente_id } = body
    if (!path || !cliente_id) return handleCORS(NextResponse.json({ error: 'path e cliente_id obrigatórios' }, { status: 400 }), origin)
    const { data: cliente } = await supabase.from('clientes_consultor').select('id, consultor_id').eq('id', cliente_id).single()
    if (!cliente) return handleCORS(NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 }), origin)
    if (user.tipo_usuario === 'consultor' && cliente.consultor_id !== user.id) return handleCORS(NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), origin)
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) return handleCORS(NextResponse.json({ error: 'Falha ao remover', detalhe: error.message }), { status: 500 })
    return handleCORS(NextResponse.json({ ok: true }), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ error: 'Erro excluir doc' }, { status: 500 }), origin)
  }
}
