import { NextResponse } from 'next/server'
import { supabase, handleCORS } from '@/lib/api-helpers'
import {
  hashPassword,
  verifyPassword,
  generateToken,
  checkRateLimit,
  sanitizeInput,
  validateEmail,
  sanitizeForLog,
} from '@/lib/security'

// Utilitário de log seguro para depuração
function logDebug(label, payload) {
  try {
    const safe = sanitizeForLog(payload || {})
    // eslint-disable-next-line no-console
    console.log(`[LOGIN] ${label}:`, safe)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(`[LOGIN] ${label}: [unserializable payload]`)
  }
}

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
  const origin = request.headers.get('origin')
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown'

  if (!checkRateLimit(`login:${clientIP}`)) {
    logDebug('RateLimit Bloqueado', { clientIP })
    return handleCORS(
      NextResponse.json(
        { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
        { status: 429 }
      ),
      origin
    )
  }

  try {
    const body = await request.json()
    const email = sanitizeInput(body.email)
    const password = body.password

    logDebug('Request Recebido', {
      origin,
      clientIP,
      email,
      hasPassword: Boolean(password)
    })

    if (!validateEmail(email) || !password) {
      logDebug('Validacao Falhou', { emailValid: validateEmail(email), hasPassword: Boolean(password) })
      return handleCORS(NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 }), origin)
    }

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, senha, tipo_usuario')
      .eq('email', email)
      .single()

    if (error) {
      logDebug('Erro Supabase Buscar Usuario', { email, error: error.message })
    } else {
      logDebug('Usuario Encontrado', { id: user?.id, email: user?.email, tipo_usuario: user?.tipo_usuario, hasSenha: Boolean(user?.senha) })
    }

    if (error || !user) {
      return handleCORS(NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 }), origin)
    }

    let passwordValid = false
    if (user.senha.startsWith('$2a$') || user.senha.startsWith('$2b$')) {
      logDebug('Verificando Senha (bcrypt)', { email })
      passwordValid = await verifyPassword(password, user.senha)
    } else {
      logDebug('Verificando Senha (texto plano)', { email })
      passwordValid = password === user.senha
      if (passwordValid) {
        const hashedPassword = await hashPassword(password)
        await supabase.from('usuarios').update({ senha: hashedPassword }).eq('id', user.id)
        logDebug('Senha Migrada Para Bcrypt', { userId: user.id, email })
      }
    }

    logDebug('Resultado Verificacao Senha', { email, passwordValid })
    if (!passwordValid) {
      return handleCORS(NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 }), origin)
    }

    const token = generateToken(user)
    logDebug('Token Gerado', { userId: user.id, email, tokenLength: token?.length })

    const { data: session } = await supabase
      .from('sessoes')
      .insert([{ id: crypto.randomUUID(), usuario_id: user.id, data_login: new Date().toISOString() }])
      .select()
      .single()

    logDebug('Sessao Iniciada', { sessionId: session?.id, userId: user.id })

    return handleCORS(
      NextResponse.json(
        {
          user: { id: user.id, nome: user.nome, email: user.email, tipo_usuario: user.tipo_usuario },
          token,
          sessionId: session?.id,
          expiresIn: '24h',
        }
      ),
      origin
    )
  } catch (error) {
    console.error('[LOGIN] Erro Inesperado:', sanitizeForLog({ message: error?.message, stack: error?.stack }))
    return handleCORS(NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 }), origin)
  }
}
