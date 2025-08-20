import { NextResponse } from 'next/server'
import { supabase, handleCORS } from '@/lib/api-helpers'

export async function OPTIONS(request) {
	const origin = request.headers.get('origin')
	return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
	const origin = request.headers.get('origin')
	try {
		const { sessionId } = await request.json().catch(() => ({}))
		if (sessionId) {
			const { data: sess } = await supabase.from('sessoes').select('data_login').eq('id', sessionId).single()
			if (sess) {
				const loginTime = new Date(sess.data_login)
				const now = new Date()
				const diff = now - loginTime
				const hours = Math.floor(diff / (1000 * 60 * 60))
				const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
				await supabase.from('sessoes').update({ data_logout: now.toISOString(), tempo_total: `${hours}:${minutes}:00` }).eq('id', sessionId)
			}
		}
		return handleCORS(NextResponse.json({ success: true }), origin)
	} catch {
		return handleCORS(NextResponse.json({ error: 'Erro no logout' }, { status: 500 }), origin)
	}
}
