import { NextResponse } from 'next/server'
import { handleCORS, requireAuth } from '@/lib/api-helpers'
import { generateToken } from '@/lib/security'

export async function GET(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }
  // Gera novo token baseado no user do cookie
  const user = auth.user
  const token = generateToken({ id: user.id, email: user.email, tipo_usuario: user.tipo_usuario })
  const res = NextResponse.json({ token })
  return handleCORS(res, origin)
}
