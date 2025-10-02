import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabase, handleCORS } from '@/lib/api-helpers'
import { generateToken, verifyPassword, validateEmail, sanitizeForLog, checkRateLimit } from '@/lib/security'

export async function OPTIONS(request) {
	const origin = request.headers.get('origin')
	return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
	const origin = request.headers.get('origin')
	try {
		const { email, password } = await request.json()
		// Rate limit por IP/email (básico - IP via header X-Forwarded-For se presente)
		const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'ip:unknown'
		const rlKey = `login:${ip}:${String(email||'').toLowerCase()}`
		if (!checkRateLimit(rlKey)) {
			return handleCORS(NextResponse.json({ error: 'Muitas tentativas, aguarde' }, { status: 429 }), origin)
		}
		if (!validateEmail(String(email || ''))) {
			return handleCORS(NextResponse.json({ error: 'Email inválido' }, { status: 400 }), origin)
		}
		if (!password || String(password).length < 3) {
			return handleCORS(NextResponse.json({ error: 'Senha inválida' }, { status: 400 }), origin)
		}

		const { data: user, error } = await supabase
			.from('usuarios')
			.select('id, nome, email, senha, tipo_usuario, must_change_password')
			.eq('email', String(email).toLowerCase())
			.single()

		if (error || !user) {
			return handleCORS(NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 }), origin)
		}

		const ok = await verifyPassword(password, user.senha)
		if (!ok) {
			return handleCORS(NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 }), origin)
		}

				const token = generateToken(user)
				const sessionId = crypto.randomUUID()
				const nowIso = new Date().toISOString()
				const expiresIso = new Date(Date.now() + 24*60*60*1000).toISOString()
				// Inserção compatível com schema produção (sem data_login/data_logout)
				try {
					await supabase.from('sessoes').insert({ id: sessionId, usuario_id: user.id, token, criado_em: nowIso, ultimo_refresh: nowIso, expirado_em: expiresIso })
				} catch (e) {
					// fallback silencioso
				}

	// Marca presença inicial do usuário no login (produção usa coluna usuarios.ultimo_refresh)
	try { await supabase.from('usuarios').update({ ultimo_refresh: nowIso }).eq('id', user.id) } catch {}

				const safeUser = { id: user.id, nome: user.nome, email: user.email, tipo_usuario: user.tipo_usuario, must_change_password: !!user.must_change_password }

				// Cria resposta e define cookies de sessão (HttpOnly, SameSite=Lax, sem Max-Age/Expires)
				const response = NextResponse.json({ user: safeUser, sessionId, token, requirePasswordReset: !!user.must_change_password })
				const isProd = process.env.NODE_ENV === 'production'
				try {
					// Novo cookie ERP
					response.cookies.set('erp_auth', token, {
						httpOnly: true,
						sameSite: 'lax',
						secure: isProd,
						path: '/',
					})
					response.cookies.set('crm_auth', token, {
						httpOnly: true,
						sameSite: 'lax',
						secure: isProd,
						path: '/',
						// Sem expires/maxAge => cookie de sessão
					})
				} catch (_) {
					// fallback direto no header Set-Cookie
					const flags = [`Path=/`, `SameSite=Lax`, `HttpOnly`]
					if (isProd) flags.push('Secure')
					response.headers.append('Set-Cookie', `erp_auth=${token}; ${flags.join('; ')}`)
					response.headers.append('Set-Cookie', `crm_auth=${token}; ${flags.join('; ')}`)
				}

				return handleCORS(response, origin)
	} catch (e) {
		console.error('Login error:', sanitizeForLog({ message: e?.message }))
		return handleCORS(NextResponse.json({ error: 'Erro no login' }, { status: 500 }), origin)
	}
}
