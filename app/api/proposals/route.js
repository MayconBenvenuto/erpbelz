import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'
import { STATUS_OPTIONS } from '@/lib/constants'
import { sendEmail } from '@/lib/email'
import { renderBrandedEmail } from '@/lib/email-template'
import { formatCurrency, formatCNPJ } from '@/lib/utils'

export async function OPTIONS(request) {
	const origin = request.headers.get('origin')
	return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function GET(request) {
	const origin = request.headers.get('origin')
	const auth = await requireAuth(request)
	if (auth.error) {
		return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
	}

	let query = supabase
		.from('propostas')
		.select('*')

	if (auth.user.tipo_usuario !== 'gestor') {
		query = query.or(`criado_por.eq.${auth.user.id},consultor_email.eq.${auth.user.email}`)
	}

	const { data, error } = await query
		.order('codigo', { ascending: true, nullsFirst: false })

	if (error) {
		return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
	}
	return handleCORS(NextResponse.json(data || []), origin)
}

const createSchema = z.object({
	cnpj: z.string().min(14),
	consultor: z.string().min(2),
	consultor_email: z.string().email(),
	operadora: z.string().min(2),
	quantidade_vidas: z.coerce.number().int().min(1),
	valor: z.coerce.number().min(0.01),
	previsao_implantacao: z.string().optional(),
	status: z.string().refine(s => STATUS_OPTIONS.includes(s)),
	criado_por: z.string().uuid(),
})

export async function POST(request) {
	const origin = request.headers.get('origin')
	const auth = await requireAuth(request)
	if (auth.error) {
		return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
	}

	const body = await request.json()
	const parsed = createSchema.safeParse(body)
	if (!parsed.success) {
		return handleCORS(NextResponse.json({ error: 'Dados inválidos', issues: parsed.error.issues }, { status: 400 }), origin)
	}

	const payload = parsed.data
	// força autor do token
	if (auth.user.tipo_usuario !== 'gestor' && payload.criado_por !== auth.user.id) {
		payload.criado_por = auth.user.id
	}

	const { data, error } = await supabase
		.from('propostas')
		.insert(payload)
		.select()
		.single()
	if (error) {
		return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
	}

	// e-mails simples de notificação
	try {
		const codigo = data.codigo || data.id
		const empresa = formatCNPJ(data.cnpj)
		const valorFmt = formatCurrency(data.valor || 0)
		const subject = `[CRM Belz] Proposta ${codigo} criada`
		const html = renderBrandedEmail({
			title: 'Nova proposta criada',
			ctaText: 'Abrir CRM',
			ctaUrl: process.env.CRM_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
			contentHtml: `
				<p>Uma nova proposta <strong>${codigo}</strong> foi criada.</p>
				<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
					<tr><td style="padding:6px 0;"><strong>Empresa:</strong> CNPJ ${empresa}</td></tr>
					<tr><td style="padding:6px 0;"><strong>Operadora:</strong> ${data.operadora}</td></tr>
					<tr><td style="padding:6px 0;"><strong>Valor:</strong> ${valorFmt}</td></tr>
					<tr><td style="padding:6px 0;"><strong>Status:</strong> ${data.status}</td></tr>
				</table>
			`,
		})
		// analista
		const { data: analyst } = await supabase.from('usuarios').select('email').eq('id', data.criado_por).single()
		if (analyst?.email) await sendEmail({ to: analyst.email, subject, html })
		// consultor
		if (data.consultor_email) await sendEmail({ to: data.consultor_email, subject, html })
	} catch {}

	return handleCORS(NextResponse.json(data), origin)
}
