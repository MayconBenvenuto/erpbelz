import { NextResponse } from 'next/server'

const SERVICE_UNAVAILABLE = NextResponse.json({ error: 'Auth indisponível. Configure NEST_API_URL.' }, { status: 503 })

async function forward(method, req) {
	const target = process.env.NEST_API_URL
	const isPublicTarget = !!target && !/^(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(target)
	if (!isPublicTarget) return SERVICE_UNAVAILABLE
	const url = `${target.replace(/\/$/, '')}/auth/login`
	const body = method === 'GET' || method === 'HEAD' ? undefined : await req.text()
	const res = await fetch(url, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body
	})
	const data = await res.text()
	return new NextResponse(data, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } })
}

export async function OPTIONS(request) { return forward('OPTIONS', request) }
export async function GET(request) { return forward('GET', request) }
export async function POST(request) { return forward('POST', request) }
export async function PATCH(request) { return forward('PATCH', request) }
export async function DELETE(request) { return forward('DELETE', request) }
