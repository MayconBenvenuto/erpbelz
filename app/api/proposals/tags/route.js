import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'
import { sanitizeInput } from '@/lib/security'

export const runtime = 'nodejs'

export async function OPTIONS(request){
  return handleCORS(new NextResponse(null,{status:200}), request.headers.get('origin'))
}

// GET ?proposta_id=uuid
export async function GET(request){
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  const { searchParams } = new URL(request.url)
  const proposta_id = searchParams.get('proposta_id')
  if (!proposta_id) return handleCORS(NextResponse.json({ error: 'proposta_id obrigatório' }, { status:400}), origin)
  const { data, error } = await supabase.from('propostas_tags').select('proposta_id, tag, criado_em').eq('proposta_id', proposta_id).order('criado_em',{ascending:false})
  if (error) return handleCORS(NextResponse.json({ error: error.message }, { status:500}), origin)
  return handleCORS(NextResponse.json(data), origin)
}

// POST { proposta_id, tag }
export async function POST(request){
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  if (auth.user.tipo_usuario === 'consultor') return handleCORS(NextResponse.json({ error: 'Sem permissão' }, { status:403}), origin)
  const body = await request.json().catch(()=>null)
  if (!body?.proposta_id || !body?.tag) return handleCORS(NextResponse.json({ error: 'Dados incompletos' }, { status:400}), origin)
  let tag = sanitizeInput(body.tag).toLowerCase().trim().slice(0,50)
  if (!tag) return handleCORS(NextResponse.json({ error: 'Tag inválida' }, { status:400}), origin)
  const { error } = await supabase.from('propostas_tags').insert({ proposta_id: body.proposta_id, tag })
  if (error && !String(error.message).includes('duplicate')) return handleCORS(NextResponse.json({ error: error.message }, { status:500}), origin)
  return handleCORS(NextResponse.json({ success: true, tag }), origin)
}

// DELETE ?proposta_id=...&tag=...
export async function DELETE(request){
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  if (auth.user.tipo_usuario === 'consultor') return handleCORS(NextResponse.json({ error: 'Sem permissão' }, { status:403}), origin)
  const { searchParams } = new URL(request.url)
  const proposta_id = searchParams.get('proposta_id')
  const tag = searchParams.get('tag')
  if (!proposta_id || !tag) return handleCORS(NextResponse.json({ error: 'Parâmetros faltando' }, { status:400}), origin)
  const { error } = await supabase.from('propostas_tags').delete().eq('proposta_id', proposta_id).eq('tag', tag)
  if (error) return handleCORS(NextResponse.json({ error: error.message }, { status:500}), origin)
  return handleCORS(NextResponse.json({ success: true }), origin)
}
