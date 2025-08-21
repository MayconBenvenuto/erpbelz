import { NextResponse } from 'next/server'
import { handleCORS, getSupabaseHealth } from '@/lib/api-helpers'

export async function OPTIONS(request) {
	const origin = request.headers.get('origin')
	return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function GET(request) {
	const origin = request.headers.get('origin')
	try {
		const health = await getSupabaseHealth()
		const status = health.ok ? 200 : 503
		return handleCORS(NextResponse.json(health, { status }), origin)
	} catch (e) {
		return handleCORS(
			NextResponse.json({ ok: false, error: 'health_check_failed' }, { status: 500 }),
			origin
		)
	}
}
