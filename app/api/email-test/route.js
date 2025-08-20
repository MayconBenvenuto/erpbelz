import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { handleCORS } from '@/lib/api-helpers'
import { sendEmail } from '@/lib/email'
import { renderBrandedEmail } from '@/lib/email-template'

export async function OPTIONS(request) {
	const origin = request.headers.get('origin')
	return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
	const origin = request.headers.get('origin')
	const { to } = await request.json().catch(() => ({}))
	const example = {
		codigo: 'PRP0001',
		cnpj: '12.345.678/0001-90',
		razao_social: 'Empresa Exemplo Ltda',
	}
	const html = renderBrandedEmail({
		title: 'Atualização de status da proposta',
		ctaText: 'Abrir CRM',
		ctaUrl: process.env.CRM_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://admbelz.vercel.app/',
		contentHtml: `
			<p>Uma proposta teve alteração de status.</p>
			<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
				<tr><td style="padding:6px 0;"><strong>Código:</strong> ${example.codigo}</td></tr>
				<tr><td style="padding:6px 0;"><strong>CNPJ:</strong> ${example.cnpj}</td></tr>
				<tr><td style="padding:6px 0;"><strong>Razão Social:</strong> ${example.razao_social}</td></tr>
			</table>
		`,
		preheader: `Proposta ${example.codigo} atualizada`,
	})
	const res = await sendEmail({
		to: to || process.env.EMAIL_OVERRIDE_TO || 'devnull@example.com',
		subject: 'Teste de Email — CRM Belz',
		text: `Proposta ${example.codigo} atualizada. CNPJ ${example.cnpj}. ${example.razao_social}.`,
		html,
	})
	if (res.ok) return handleCORS(NextResponse.json({ ok: true }), origin)
	return handleCORS(NextResponse.json({ ok: false, error: res.error || 'fail' }, { status: 500 }), origin)
}
