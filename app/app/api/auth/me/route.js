import { NextResponse } from 'next/server'
import { handleCORS, requireAuth, supabase } from '@/lib/api-helpers'

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

  // garantir que o usuário ainda existe e retornar shape consistente
  try {
    const { data: userRow, error } = await supabase
      .from('usuarios')
  .select('id, nome, email, tipo_usuario, must_change_password')
      .eq('id', auth.user.id)
      .single()

    if (error || !userRow) {
      return handleCORS(NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 }), origin)
    }

  return handleCORS(NextResponse.json({ user: userRow }), origin)
  } catch {
    return handleCORS(NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 }), origin)
  }
}
