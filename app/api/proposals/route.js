import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { z } from 'zod'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'
import { STATUS_OPTIONS, OPERADORAS } from '@/lib/constants'
import { hasPermission } from '@/lib/rbac'
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
	// Bloqueia papéis sem permissão de visualizar propostas
	if (!hasPermission(auth.user,'viewPropostas')) {
		return handleCORS(NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), origin)
	}

	const buildBase = () => {
		let q = supabase.from('propostas').select('*')
		if (auth.user.tipo_usuario === 'consultor') {
			// Consultor: vê apenas propostas que criou ou cujo email de consultor é o seu
			q = q.or(`criado_por.eq.${auth.user.id},consultor_email.eq.${auth.user.email}`)
		} else if (auth.user.tipo_usuario === 'analista_implantacao') {
		// Analista de implantação: mesma lógica do antigo analista
		q = q.or(`criado_por.eq.${auth.user.id},atendido_por.eq.${auth.user.id},atendido_por.is.null`)
		} else if (auth.user.tipo_usuario === 'gerente') {
		// Gerente enxerga tudo (como gestor porém sem permissão de gestão de usuários)
		// nada a adicionar
		}
		return q
	}

	// 1) Tentativa com ordenação por código (preferencial)
	let { data, error } = await buildBase()
		.order('codigo', { ascending: true })
		.order('criado_em', { ascending: true })
	if (error) {
		// 2) Fallback: ordena por criado_em (asc)
		const fallback = await buildBase().order('criado_em', { ascending: true })
		data = fallback.data
		error = fallback.error
	}

	if (error) {
		return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
	}
	// Enriquecimento leve: dias/horas em análise (desde criado_em até agora)
	const now = Date.now()
	const enriched = (data || []).map(p => {
		const createdTs = p?.criado_em ? new Date(p.criado_em).getTime() : null
		let horas = null, dias = null
		if (createdTs && !isNaN(createdTs)) {
			const diffH = (now - createdTs) / 1000 / 3600
			horas = Math.floor(diffH)
			dias = Math.floor(diffH / 24)
		}
		return { ...p, horas_em_analise: horas, dias_em_analise: dias }
	})
	return handleCORS(NextResponse.json(enriched), origin)
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
	// Para analista/gestor continua enviando consultor e consultor_email.
	consultor: z.string().min(2).optional(),
	consultor_email: z.string().email().optional(),
	cliente_nome: z.string().min(2).optional(),
	cliente_email: z.string().email().optional(),
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
	if (!hasPermission(auth.user,'viewPropostas')) {
		return handleCORS(NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), origin)
	}
	// Antes: consultor não podia criar. Agora permitido (consultor é quem abre a proposta).
	// Regras adicionais: se for consultor, sempre força status inicial 'em análise' para evitar criação já implantada

	const body = await request.json()
	const parsed = createSchema.safeParse(body)
	if (!parsed.success) {
		const payloadErr = process.env.NODE_ENV === 'production'
			? { error: 'Dados inválidos' }
			: { error: 'Dados inválidos', issues: parsed.error.issues }
		return handleCORS(NextResponse.json(payloadErr, { status: 400 }), origin)
	}

	const payload = { ...parsed.data }
	if (auth.user.tipo_usuario === 'consultor') {
		payload.status = 'em análise'
		// Garante nome e email do consultor mesmo se user.nome estiver vazio ou null
		let resolvedNome = (auth.user.nome || '').trim()
		if (!resolvedNome) {
			// Tentativa de recuperar do banco
			try {
				const { data: u } = await supabase.from('usuarios').select('nome,email').eq('id', auth.user.id).single()
				if (u?.nome) resolvedNome = u.nome.trim()
				if (!payload.consultor_email && u?.email) payload.consultor_email = u.email
			} catch (_) {}
		}
		if (!resolvedNome) resolvedNome = 'Consultor'
		payload.consultor = resolvedNome
		payload.consultor_email = auth.user.email || payload.consultor_email || ''
		if (!payload.consultor_email) {
			return handleCORS(NextResponse.json({ error: 'Email do consultor ausente' }, { status: 400 }), origin)
		}
		// Campos de cliente tornam-se obrigatórios nesse fluxo
		if (!payload.cliente_nome || !payload.cliente_email) {
			return handleCORS(NextResponse.json({ error: 'Informe nome e email do cliente' }, { status: 400 }), origin)
		}
	} else {
		// Para analista/gestor manter necessidade de consultor e consultor_email
		if (!payload.consultor || !payload.consultor_email) {
			return handleCORS(NextResponse.json({ error: 'Consultor e email do consultor são obrigatórios' }, { status: 400 }), origin)
		}
	}
	if (payload.consultor_email) payload.consultor_email = payload.consultor_email.trim().toLowerCase()
	if (payload.cliente_email) payload.cliente_email = payload.cliente_email.trim().toLowerCase()
	// força autor do token (para consultor e analista)
	if (auth.user.tipo_usuario !== 'gestor') {
		payload.criado_por = auth.user.id
	}

	// Campos de atendimento (analista que assumir depois)
	payload.atendido_por = null
	payload.atendido_em = null
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
					${data.cliente_nome ? `<tr><td style="padding:6px 0;"><strong>Cliente:</strong> ${data.cliente_nome}${data.cliente_email ? ' (' + data.cliente_email + ')' : ''}</td></tr>` : ''}
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
