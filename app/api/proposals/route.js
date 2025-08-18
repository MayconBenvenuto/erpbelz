import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'
import { z } from 'zod'

const createProposalSchema = z.object({
  cnpj: z.string().min(14),
  consultor: z.string().min(2),
  operadora: z.string().min(2),
  quantidade_vidas: z.coerce.number().int().min(1),
  valor: z.coerce.number().min(0),
  previsao_implantacao: z.string().nullable().optional(),
  status: z.string().min(2),
  criado_por: z.string().uuid(),
})

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

  let query = supabase
    .from('propostas')
    .select('*')
    .order('criado_em', { ascending: false })

  if (auth.user.tipo_usuario !== 'gestor') {
    query = query.eq('criado_por', auth.user.id)
  }

  const { data, error } = await query

  if (error) {
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  }

  return handleCORS(NextResponse.json(data || []), origin)
}

export async function POST(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }

  const body = await request.json()
  const parsed = createProposalSchema.safeParse(body)
  if (!parsed.success) {
    return handleCORS(
      NextResponse.json({ error: 'Dados inválidos', issues: parsed.error.issues }, { status: 400 }),
      origin
    )
  }

  const dataToInsert = {
    id: crypto.randomUUID(),
    ...parsed.data,
    criado_em: new Date().toISOString(),
  }

  // Defesa: se o usuário for analista, força criado_por === user.id
  if (auth.user.tipo_usuario !== 'gestor' && dataToInsert.criado_por !== auth.user.id) {
    dataToInsert.criado_por = auth.user.id
  }

  const { data, error } = await supabase.from('propostas').insert([dataToInsert]).select().single()

  if (error) {
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  }

  if (data.status === 'implantado') {
    await supabase.rpc('atualizar_meta_usuario', {
      p_usuario_id: data.criado_por,
      p_valor: Number(data.valor) || 0,
    })
  }

  return handleCORS(NextResponse.json(data), origin)
}
