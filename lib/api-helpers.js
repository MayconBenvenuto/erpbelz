import { createClient } from '@supabase/supabase-js'
import { verifyToken, addSecurityHeaders } from '@/lib/security'

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
export const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']

export function handleCORS(response, origin = '*') {
  const isAllowedOrigin = allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development'

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400')

  return addSecurityHeaders(response)
}

export async function requireAuth(request) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Token de acesso requerido', status: 401 }
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)

  if (!decoded) {
    return { error: 'Token inválido ou expirado', status: 401 }
  }

  // Normaliza o shape para o restante das rotas
  const user = {
    id: decoded.userId,
    email: decoded.email,
    tipo_usuario: decoded.tipo,
  }
  return { user }
}

export function ensureGestor(user) {
  if (user?.tipo_usuario !== 'gestor') {
    return { error: 'Ação permitida apenas para gestores', status: 403 }
  }
  return null
}
