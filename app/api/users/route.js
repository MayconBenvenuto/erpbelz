import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth, ensureGestor } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/security'
import { z } from 'zod'

const createUserSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(4),
  tipo_usuario: z.enum(['gestor', 'analista']).optional(),
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

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, tipo_usuario, criado_em')
    .order('nome')

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
  const guard = ensureGestor(auth.user)
  if (guard) return handleCORS(NextResponse.json(guard, { status: guard.status }), origin)

  const body = await request.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return handleCORS(
      NextResponse.json({ error: 'Dados inválidos', issues: parsed.error.issues }, { status: 400 }),
      origin
    )
  }

  const { data: existingUser } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', parsed.data.email)
    .single()

  if (existingUser) {
    return handleCORS(NextResponse.json({ error: 'Email já cadastrado no sistema' }, { status: 400 }), origin)
  }

  const toInsert = {
    id: crypto.randomUUID(),
    nome: parsed.data.nome,
    email: parsed.data.email,
    senha: await hashPassword(parsed.data.senha),
    tipo_usuario: parsed.data.tipo_usuario || 'analista',
    criado_em: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('usuarios')
    .insert([toInsert])
    .select('id, nome, email, tipo_usuario, criado_em')
    .single()

  if (error) {
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  }

  await supabase.from('metas').insert([
    {
      id: crypto.randomUUID(),
      usuario_id: data.id,
  valor_meta: 200000.0,
      valor_alcancado: 0.0,
      periodo: new Date().getFullYear().toString(),
    },
  ])

  return handleCORS(NextResponse.json(data), origin)
}
