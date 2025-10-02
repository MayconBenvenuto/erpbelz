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
				// Buscar última sessão não expirada
				if (!targetSessionId && authUser?.id) {
					try {
						const { data: lastOpen } = await supabase
							.from('sessoes')
							.select('id, expirado_em')
							.eq('usuario_id', authUser.id)
							.order('criado_em', { ascending: false })
							.limit(1)
						if (lastOpen && lastOpen.length && lastOpen[0].id) targetSessionId = lastOpen[0].id
					} catch {}
				}

				if (targetSessionId) {
					try {
						await supabase
							.from('sessoes')
							.update({ expirado_em: new Date().toISOString(), ultimo_refresh: new Date().toISOString() })
							.eq('id', targetSessionId)
					} catch {}
				}

				if (authUser?.id) {
					try { await supabase.from('usuarios').update({ ultimo_refresh: new Date().toISOString() }).eq('id', authUser.id) } catch {}
				}

			const response = NextResponse.json({ success: true })
			const isProd = process.env.NODE_ENV === 'production'
			try {
				response.cookies.set('erp_auth', '', {
					httpOnly: true,
					sameSite: 'lax',
					secure: isProd,
					path: '/',
					expires: new Date(0)
				})
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
				response.headers.append('Set-Cookie', `erp_auth=; ${flags.join('; ')}`)
				response.headers.append('Set-Cookie', `crm_auth=; ${flags.join('; ')}`)
			}

			return handleCORS(response, origin)
	} catch {
		return handleCORS(NextResponse.json({ error: 'Erro no logout' }, { status: 500 }), origin)
	}
}
