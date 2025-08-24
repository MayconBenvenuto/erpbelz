import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { z } from 'zod'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'
import { STATUS_OPTIONS, OPERADORAS } from '@/lib/constants'
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

	const buildBase = () => {
		let q = supabase.from('propostas').select('*')
		if (auth.user.tipo_usuario !== 'gestor') {
			q = q.or(`criado_por.eq.${auth.user.id},consultor_email.eq.${auth.user.email}`)
		}
		return q
	}

	// 1) Tentativa com ordenação por código (preferencial)
	let { data, error } = await buildBase().order('codigo', { ascending: true })
	if (error) {
		// 2) Fallback: ordena por criado_em (asc)
		const fallback = await buildBase().order('criado_em', { ascending: true })
		data = fallback.data
		error = fallback.error
	}

	if (error) {
		return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
	}
	return handleCORS(NextResponse.json(data || []), origin)
}

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
const validateFutureOrToday = (d) => {
	if (!isoDateRegex.test(d)) return false
	const dt = new Date(d + 'T00:00:00Z')
	if (isNaN(dt.getTime())) return false
	const today = new Date()
	const todayUTC = new Date(today.toISOString().slice(0,10) + 'T00:00:00Z')
	return dt >= todayUTC
}

const createSchema = z.object({
	cnpj: z.string().min(14),
	consultor: z.string().min(2),
	consultor_email: z.string().email(),
	operadora: z.enum([...OPERADORAS]),
	quantidade_vidas: z.coerce.number().int().min(1),
	valor: z.coerce.number().min(0.01),
	previsao_implantacao: z.string().regex(isoDateRegex).refine(validateFutureOrToday, 'Data não pode ser passada').optional(),
	status: z.enum([...STATUS_OPTIONS]),
	criado_por: z.string().uuid(),
})

export async function POST(request) {
	const origin = request.headers.get('origin')
	const auth = await requireAuth(request)
	if (auth.error) {
		return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
	}
	if (auth.user.tipo_usuario === 'consultor') {
		return handleCORS(NextResponse.json({ error: 'Consultores não podem criar propostas' }, { status: 403 }), origin)
	}

	const body = await request.json()
	const parsed = createSchema.safeParse(body)
	if (!parsed.success) {
		const payloadErr = process.env.NODE_ENV === 'production'
			? { error: 'Dados inválidos' }
			: { error: 'Dados inválidos', issues: parsed.error.issues }
		return handleCORS(NextResponse.json(payloadErr, { status: 400 }), origin)
	}

	const payload = { ...parsed.data }
	payload.consultor_email = payload.consultor_email.trim().toLowerCase()
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

		// Caso a proposta já seja criada como "implantado", credita imediatamente na meta do analista
		try {
			if (data?.status === 'implantado' && data?.criado_por) {
				const valor = Number(data?.valor || 0)
				if (valor > 0) {
					await supabase.rpc('atualizar_meta_usuario', {
						p_usuario_id: data.criado_por,
						p_valor: valor,
					})
				}
			}
		} catch (_) {
			// silencioso: não bloqueia criação se atualização de meta falhar
		}

	// e-mails simples de notificação
	try {
		const codigo = data.codigo || data.id
		const empresa = formatCNPJ(data.cnpj)
		const valorFmt = formatCurrency(data.valor || 0)
		const subject = `[Sistema de Gestão - Belz] Proposta ${codigo} criada`
		const html = renderBrandedEmail({
			title: 'Nova proposta criada',
			ctaText: 'Abrir CRM',
			ctaUrl: process.env.CRM_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://admbelz.vercel.app/',
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
