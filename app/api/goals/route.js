import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'

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
