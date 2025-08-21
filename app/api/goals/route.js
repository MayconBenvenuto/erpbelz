import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'
import { z } from 'zod'

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

	// 1) Buscar metas configuradas (alvo/target)
	let metasQuery = supabase
		.from('metas')
		.select('usuario_id, valor_meta, valor_alcancado, atualizado_em')

	if (auth.user.tipo_usuario !== 'gestor') {
		metasQuery = metasQuery.eq('usuario_id', auth.user.id)
	}
	const { data: metas, error: metasError } = await metasQuery
	if (metasError) {
		return handleCORS(NextResponse.json({ error: metasError.message }, { status: 500 }), origin)
	}

	// 2) Calcular valor_alcancado real a partir das propostas implantadas
	let propsQuery = supabase
		.from('propostas')
		.select('criado_por, valor, status')
		.eq('status', 'implantado')

	if (auth.user.tipo_usuario !== 'gestor') {
		propsQuery = propsQuery.eq('criado_por', auth.user.id)
	}

	const { data: propostas, error: propsError } = await propsQuery
	if (propsError) {
		return handleCORS(NextResponse.json({ error: propsError.message }, { status: 500 }), origin)
	}

	const somaPorUsuario = new Map()
	for (const p of propostas || []) {
		const uid = p.criado_por
		const val = Number(p.valor || 0)
		somaPorUsuario.set(uid, Number((Number(somaPorUsuario.get(uid) || 0) + val).toFixed(2)))
	}

	// 3) Combinar: manter valor_meta do banco e substituir valor_alcancado pelo somatório real
	const result = (metas || []).map(m => ({
		usuario_id: m.usuario_id,
		valor_meta: Number(m.valor_meta || 0),
		valor_alcancado: Number(somaPorUsuario.get(m.usuario_id) || 0),
		atualizado_em: m.atualizado_em,
	}))

	return handleCORS(NextResponse.json(result), origin)
}

export async function POST(request) {
	const origin = request.headers.get('origin')
	const auth = await requireAuth(request)
	if (auth.error) {
		return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
	}
	if (auth.user.tipo_usuario !== 'gestor') {
		return handleCORS(NextResponse.json({ error: 'Apenas gestores' }, { status: 403 }), origin)
	}

	// Soma por usuário a partir das propostas implantadas
	const { data: propostas, error: propsError } = await supabase
		.from('propostas')
		.select('criado_por, valor')
		.eq('status', 'implantado')

	if (propsError) {
		return handleCORS(NextResponse.json({ error: propsError.message }, { status: 500 }), origin)
	}

	const sums = new Map()
	for (const p of propostas || []) {
		const uid = p.criado_por
		const val = Number(p.valor || 0)
		sums.set(uid, Number((Number(sums.get(uid) || 0) + val).toFixed(2)))
	}

	// Atualiza metas.valor_alcancado para os usuários já existentes na tabela metas
	const { data: metas } = await supabase.from('metas').select('usuario_id')
	const metasUsers = new Set((metas || []).map(m => m.usuario_id))

	for (const uid of metasUsers) {
		const val = Number(sums.get(uid) || 0)
		await supabase
			.from('metas')
			.update({ valor_alcancado: val, atualizado_em: new Date().toISOString() })
			.eq('usuario_id', uid)
	}

	return handleCORS(NextResponse.json({ ok: true, updated: metasUsers.size }), origin)
}

export async function PATCH(request) {
	const origin = request.headers.get('origin')
	const auth = await requireAuth(request)
	if (auth.error) {
		return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
	}
	if (auth.user.tipo_usuario !== 'gestor') {
		return handleCORS(NextResponse.json({ error: 'Apenas gestores' }, { status: 403 }), origin)
	}

	const body = await request.json().catch(() => ({}))
	const schema = z.object({
		usuario_id: z.string().uuid(),
		valor_meta: z.coerce.number().min(0),
		valor_alcancado: z.coerce.number().min(0).optional(),
	})
	const parsed = schema.safeParse(body)
	if (!parsed.success) {
		return handleCORS(NextResponse.json({ error: 'Dados inválidos', issues: parsed.error.issues }, { status: 400 }), origin)
	}
	const { usuario_id, valor_meta, valor_alcancado } = parsed.data

	// Verifica se já existe meta para o usuário
	const { data: existing, error: selErr } = await supabase
		.from('metas')
		.select('usuario_id')
		.eq('usuario_id', usuario_id)
		.maybeSingle()
	if (selErr) {
		return handleCORS(NextResponse.json({ error: selErr.message }, { status: 500 }), origin)
	}

	const payload = {
		valor_meta: Number(valor_meta),
		atualizado_em: new Date().toISOString(),
		...(typeof valor_alcancado !== 'undefined' ? { valor_alcancado: Number(valor_alcancado) } : {}),
	}

	let res
	if (existing) {
		res = await supabase
			.from('metas')
			.update(payload)
			.eq('usuario_id', usuario_id)
			.select('usuario_id, valor_meta, valor_alcancado, atualizado_em')
			.single()
	} else {
		res = await supabase
			.from('metas')
			.insert({ usuario_id, ...payload })
			.select('usuario_id, valor_meta, valor_alcancado, atualizado_em')
			.single()
	}

	if (res.error) {
		return handleCORS(NextResponse.json({ error: res.error.message }, { status: 500 }), origin)
	}

	return handleCORS(NextResponse.json(res.data), origin)
}
