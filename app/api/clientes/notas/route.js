import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'
import { sanitizeInput } from '@/lib/security'

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
    // ownership verificado via policies, mas checamos para feedback rápido
    const { data: cliente } = await supabase.from('clientes_consultor').select('id, consultor_id').eq('id', clienteId).single()
    if (!cliente) return handleCORS(NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 }), origin)
    if (user.tipo_usuario === 'consultor' && cliente.consultor_id !== user.id) return handleCORS(NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), origin)
    const { data, error } = await supabase.from('clientes_notas').select('id, nota, autor_id, criado_em').eq('cliente_id', clienteId).order('criado_em', { ascending: false })
    if (error) return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
    return handleCORS(NextResponse.json(data || []), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ error: 'Erro ao listar notas' }, { status: 500 }), origin)
  }
}

export async function POST(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  const user = auth.user
  try {
  // analista_cliente permitido
    const body = await request.json().catch(()=>({}))
    const { cliente_id, nota } = body
    if (!cliente_id || !nota) return handleCORS(NextResponse.json({ error: 'cliente_id e nota obrigatórios' }, { status: 400 }), origin)
    const safe = sanitizeInput(nota).slice(0, 2000)
    const { data: cliente } = await supabase.from('clientes_consultor').select('id, consultor_id').eq('id', cliente_id).single()
    if (!cliente) return handleCORS(NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 }), origin)
    if (user.tipo_usuario === 'consultor' && cliente.consultor_id !== user.id) return handleCORS(NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), origin)
    const { data, error } = await supabase.from('clientes_notas').insert({ cliente_id, autor_id: user.id, nota: safe }).select('id, nota, autor_id, criado_em').single()
    if (error) return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
    return handleCORS(NextResponse.json(data), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ error: 'Erro ao criar nota' }, { status: 500 }), origin)
  }
}

export async function DELETE(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  const user = auth.user
  try {
    const body = await request.json().catch(()=>({}))
    const { id } = body
    if (!id) return handleCORS(NextResponse.json({ error: 'id obrigatório' }, { status: 400 }), origin)
    // Checa autoria
    const { data: notaRow } = await supabase.from('clientes_notas').select('id, autor_id').eq('id', id).single()
    if (!notaRow) return handleCORS(NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 }), origin)
    if (notaRow.autor_id !== user.id && user.tipo_usuario === 'consultor') return handleCORS(NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), origin)
    const { error } = await supabase.from('clientes_notas').delete().eq('id', id)
    if (error) return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
    return handleCORS(NextResponse.json({ ok: true }), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ error: 'Erro ao excluir nota' }, { status: 500 }), origin)
  }
}
