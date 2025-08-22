import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'

export async function OPTIONS(request) {
	const origin = request.headers.get('origin')
	return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
	const origin = request.headers.get('origin')
	try {
		const { sessionId } = await request.json().catch(() => ({}))

		// Tenta identificar o usuário autenticado para fallback
		let authUser = null
		try {
			const auth = await requireAuth(request)
			if (!auth.error) authUser = auth.user
		} catch {}

		let targetSessionId = sessionId || null
		// Se não veio sessionId ou não existir, tentar achar a última sessão aberta do usuário (se autenticado)
		if (!targetSessionId && authUser?.id) {
			const { data: lastOpen } = await supabase
				.from('sessoes')
				.select('id, data_login')
				.eq('usuario_id', authUser.id)
				.is('data_logout', null)
				.order('data_login', { ascending: false })
				.limit(1)
				.maybeSingle?.() || {}

			if (lastOpen?.id) targetSessionId = lastOpen.id
		}

		if (targetSessionId) {
			// Busca a sessão e encerra
			const { data: sess } = await supabase
				.from('sessoes')
				.select('data_login')
				.eq('id', targetSessionId)
				.maybeSingle?.() || {}

			if (sess?.data_login) {
				const loginTime = new Date(sess.data_login)
				const now = new Date()
				const diff = now - loginTime
				const hours = Math.floor(diff / (1000 * 60 * 60))
				const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
				await supabase
					.from('sessoes')
					.update({ data_logout: now.toISOString(), tempo_total: `${hours}:${minutes}:00` })
					.eq('id', targetSessionId)
			}
		}

			const response = NextResponse.json({ success: true })
			const isProd = process.env.NODE_ENV === 'production'
			try {
				response.cookies.set('crm_auth', '', {
					httpOnly: true,
					sameSite: 'lax',
					secure: isProd,
					path: '/',
					expires: new Date(0)
				})
			} catch (_) {
				const flags = [`Path=/`, `SameSite=Lax`, `HttpOnly`, `Expires=${new Date(0).toUTCString()}`]
				if (isProd) flags.push('Secure')
				response.headers.append('Set-Cookie', `crm_auth=; ${flags.join('; ')}`)
			}

			return handleCORS(response, origin)
	} catch {
		return handleCORS(NextResponse.json({ error: 'Erro no logout' }, { status: 500 }), origin)
	}
}
