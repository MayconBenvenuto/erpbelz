import { NextResponse } from 'next/server'
import { handleCORS, requireAuth, ensureGestor } from '@/lib/api-helpers'
import { sendEmail } from '@/lib/email'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }
  const guard = ensureGestor(auth.user)
  if (guard) return handleCORS(NextResponse.json(guard, { status: guard.status }), origin)

  const body = await request.json().catch(() => ({}))
  const to = body.to || process.env.EMAIL_OVERRIDE_TO || auth.user.email
  const res = await sendEmail({
    to,
    subject: 'Teste de e-mail - CRM Belz',
    text: 'Este é um e-mail de teste do CRM Belz.',
    html: '<p>Este é um <strong>e-mail de teste</strong> do CRM Belz.</p>'
  })
  if (!res.ok) {
    return handleCORS(NextResponse.json({ ok: false, error: res.error }, { status: 500 }), origin)
  }
  return handleCORS(NextResponse.json({ ok: true, messageId: res.id, to }), origin)
}
