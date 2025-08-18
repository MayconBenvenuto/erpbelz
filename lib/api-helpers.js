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

// Log de configuração (apenas dev) para ajudar na depuração de conexão
let _configLogged = false
function logSupabaseConfigDev() {
  if (_configLogged || process.env.NODE_ENV === 'production') return
  _configLogged = true
  try {
    const urlHost = (() => {
      try { return new URL(supabaseUrl).host } catch { return 'invalid-url' }
    })()
    const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    // eslint-disable-next-line no-console
    console.log('[SUPABASE] Config:', {
      urlHost,
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasServiceRoleKey: usingServiceRole,
      usingServiceRole,
    })
    if (!supabaseUrl || /example\.supabase\.co/.test(supabaseUrl)) {
      // eslint-disable-next-line no-console
      console.warn('[SUPABASE] URL parece inválida ou de exemplo. Atualize NEXT_PUBLIC_SUPABASE_URL no .env.local')
    }
  } catch {}
}
logSupabaseConfigDev()

// Utilitário para health check da conexão
export async function getSupabaseHealth() {
  try {
    const { error, count } = await supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
    return {
      ok: !error,
      error: error?.message || null,
      count: typeof count === 'number' ? count : null,
      urlHost: (() => { try { return new URL(supabaseUrl).host } catch { return 'invalid-url' } })(),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    }
  } catch (e) {
    return {
      ok: false,
      error: e?.message || 'unknown error',
      urlHost: (() => { try { return new URL(supabaseUrl).host } catch { return 'invalid-url' } })(),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    }
  }
}

export async function requireAuth(request) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // eslint-disable-next-line no-console
    console.warn('[AUTH] Header ausente ou malformado')
    return { error: 'Token de acesso requerido', status: 401 }
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)

  if (!decoded) {
    // eslint-disable-next-line no-console
    console.warn('[AUTH] Token inválido ou expirado')
    return { error: 'Token inválido ou expirado', status: 401 }
  }

  // eslint-disable-next-line no-console
  console.log('[AUTH] Token OK', { userId: decoded.userId, email: decoded.email, tipo: decoded.tipo })

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
