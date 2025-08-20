import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { handleCORS } from '@/lib/api-helpers'
import { sendEmail } from '@/lib/email'

export async function OPTIONS(request) {
	const origin = request.headers.get('origin')
	return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
	const origin = request.headers.get('origin')
	const { to } = await request.json().catch(() => ({}))
	const res = await sendEmail({ to: to || process.env.EMAIL_OVERRIDE_TO || 'devnull@example.com', subject: 'Teste de Email', text: 'ok' })
	if (res.ok) return handleCORS(NextResponse.json({ ok: true }), origin)
	return handleCORS(NextResponse.json({ ok: false, error: res.error || 'fail' }, { status: 500 }), origin)
}
