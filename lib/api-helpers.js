import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { verifyToken, addSecurityHeaders } from '@/lib/security'

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
export const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Evita crash em import caso variáveis não estejam definidas
// Usa placeholders seguros (não funcionais) para permitir que as rotas retornem erros controlados
const _safeUrl = supabaseUrl || 'https://example.supabase.co'
const _safeKey = supabaseServiceKey || 'public-anon-key'
export const supabase = createClient(_safeUrl, _safeKey)

export const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']

export function handleCORS(response, origin = '*') {
  const isAllowedOrigin = allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development'

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
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
      try {
        return new URL(supabaseUrl).host
      } catch {
        return 'invalid-url'
      }
    })()
    const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    // eslint-disable-next-line no-console
    console.log('[SUPABASE] Config:', {
      urlHost,
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasServiceRoleKey: usingServiceRole,
      usingServiceRole,
    })
    if (!supabaseUrl || /example\.supabase\.co/.test(_safeUrl)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[SUPABASE] URL parece inválida ou de exemplo. Atualize NEXT_PUBLIC_SUPABASE_URL no .env.local'
      )
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
      urlHost: (() => {
        try {
          return new URL(supabaseUrl).host
        } catch {
          return 'invalid-url'
        }
      })(),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    }
  } catch (e) {
    return {
      ok: false,
      error: e?.message || 'unknown error',
      urlHost: (() => {
        try {
          return new URL(supabaseUrl).host
        } catch {
          return 'invalid-url'
        }
      })(),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    }
  }
}

export async function requireAuth(request) {
  let token = null
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    // tenta via cookie de sessão
    try {
      // 1) Header Cookie direto
      const cookieHeader = request.headers.get('cookie') || ''
      const parts = cookieHeader.split(/;\s*/)
      const erp = parts.find((c) => c.startsWith('erp_auth='))
      const crm = parts.find((c) => c.startsWith('crm_auth='))
      const raw = erp || crm
      if (raw) token = decodeURIComponent(raw.split('=')[1] || '')
      // 2) Fallback: cookies() do Next (roteadores App Router)
      if (!token) {
        try {
          const jar = cookies()
          const c = jar.get?.('erp_auth')?.value || jar.get?.('crm_auth')?.value
          if (c) token = c
        } catch (_) {
          /* contexto pode não expor cookies(); ignora */
        }
      }
    } catch {}
  }

  if (!token) {
    // eslint-disable-next-line no-console
    console.warn('[AUTH] Token ausente (sem Authorization e sem cookie)')
    return { error: 'Token de acesso requerido', status: 401 }
  }
  const decoded = verifyToken(token)

  if (!decoded) {
    // eslint-disable-next-line no-console
    console.warn('[AUTH] Token inválido ou expirado')
    return { error: 'Token inválido ou expirado', status: 401 }
  }

  // eslint-disable-next-line no-console
  console.log('[AUTH] Token OK', {
    userId: decoded.userId,
    email: decoded.email,
    tipo: decoded.tipo,
  })

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

// Traduz erros comuns do Supabase para códigos HTTP mais adequados
export function mapSupabaseErrorToStatus(error) {
  const msg = String(error?.message || '').toLowerCase()
  // Permissão/RLS negada
  if (
    msg.includes('permission denied') ||
    msg.includes('rls') ||
    msg.includes('row level security') ||
    msg.includes('not authorized') ||
    msg.includes('jwt') // falhas de claims
  ) {
    return 403
  }
  return 500
}

// Cache helpers para rotas GET autenticadas (cache privado no browser)
function computeETag(payload) {
  try {
    const json = typeof payload === 'string' ? payload : JSON.stringify(payload)
    const hash = crypto.createHash('sha1').update(json).digest('base64').slice(0, 27)
    return `W/"${hash}.${json.length}"`
  } catch {
    return null
  }
}

export function cacheJson(request, origin, payload, opts = {}) {
  const { maxAge = 120, swr = 300, status = 200 } = opts
  const etag = computeETag(payload)
  const ifNoneMatch = request.headers.get('if-none-match')
  const cacheHeader = `private, max-age=${maxAge}, stale-while-revalidate=${swr}`

  if (etag && ifNoneMatch && ifNoneMatch === etag) {
    const res = new Response(null, { status: 304 })
    res.headers.set('Cache-Control', cacheHeader)
    res.headers.set('ETag', etag)
    res.headers.set('Vary', 'Authorization, Cookie, Origin')
    return handleCORS(res, origin)
  }
  const res = new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
  res.headers.set('Cache-Control', cacheHeader)
  if (etag) res.headers.set('ETag', etag)
  res.headers.set('Vary', 'Authorization, Cookie, Origin')
  return handleCORS(res, origin)
}
