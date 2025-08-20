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

	let query = supabase
		.from('metas')
		.select('usuario_id, valor_meta, valor_alcancado, atualizado_em')

	if (auth.user.tipo_usuario !== 'gestor') {
		query = query.eq('usuario_id', auth.user.id)
	}

	const { data, error } = await query
	if (error) {
		return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
	}

	return handleCORS(NextResponse.json(data || []), origin)
}
