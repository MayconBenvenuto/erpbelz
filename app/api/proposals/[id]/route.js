import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth, ensureGestor } from '@/lib/api-helpers'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.string().min(2),
  criado_por: z.string().uuid().optional(),
  valor: z.coerce.number().optional(),
})

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function DELETE(request, { params }) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }
  const guard = ensureGestor(auth.user)
  if (guard) return handleCORS(NextResponse.json(guard, { status: guard.status }), origin)

  const { id } = params

  const { error } = await supabase.from('propostas').delete().eq('id', id)
  if (error) {
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  }

  return handleCORS(NextResponse.json({ success: true }), origin)
}

export async function PUT(request, { params }) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }

  const { id } = params
  const body = await request.json()
  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return handleCORS(
      NextResponse.json({ error: 'Dados inválidos', issues: parsed.error.issues }, { status: 400 }),
      origin
    )
  }

  const { status, criado_por, valor } = parsed.data

  // Busca a proposta para checar autorização do usuário
  const { data: currentProposal, error: fetchError } = await supabase
    .from('propostas')
    .select('id, criado_por, valor, status')
    .eq('id', id)
    .single()
  if (fetchError || !currentProposal) {
    return handleCORS(NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 }), origin)
  }

  // Regra: gestor pode alterar qualquer; analista só altera a própria
  if (auth.user.tipo_usuario !== 'gestor' && currentProposal.criado_por !== auth.user.id) {
    return handleCORS(NextResponse.json({ error: 'Sem permissão para alterar esta proposta' }, { status: 403 }), origin)
  }

  const { data, error } = await supabase
    .from('propostas')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  }

  if (status === 'implantado' && (criado_por || data.criado_por)) {
    await supabase.rpc('atualizar_meta_usuario', {
      p_usuario_id: criado_por || data.criado_por,
      p_valor: Number(valor || data.valor || 0),
    })
  }

  return handleCORS(NextResponse.json(data), origin)
}
