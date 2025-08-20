import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/security'

export async function OPTIONS(request) {
	const origin = request.headers.get('origin')
	return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function GET(request) {
	const origin = request.headers.get('origin')
	const auth = await requireAuth(request)
	if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)

	const { data, error } = await supabase.from('usuarios').select('id, nome, email, tipo_usuario, criado_em')
	if (error) return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
	return handleCORS(NextResponse.json(data || []), origin)
}

const createSchema = z.object({
	nome: z.string().min(2),
	email: z.string().email(),
	senha: z.string().min(6),
	tipo_usuario: z.enum(['gestor','analista'])
})

export async function POST(request) {
	const origin = request.headers.get('origin')
	const auth = await requireAuth(request)
	if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
	if (auth.user.tipo_usuario !== 'gestor') {
		return handleCORS(NextResponse.json({ error: 'Apenas gestores podem criar usuários' }, { status: 403 }), origin)
	}
	const body = await request.json()
	const parsed = createSchema.safeParse(body)
	if (!parsed.success) return handleCORS(NextResponse.json({ error: 'Dados inválidos', issues: parsed.error.issues }, { status: 400 }), origin)

	const hashed = await hashPassword(parsed.data.senha)
	const { data, error } = await supabase.from('usuarios').insert({ ...parsed.data, senha: hashed }).select('id, nome, email, tipo_usuario').single()
	if (error) return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
	return handleCORS(NextResponse.json(data), origin)
}
