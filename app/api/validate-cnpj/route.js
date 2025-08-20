import { NextResponse } from 'next/server'
import { handleCORS } from '@/lib/api-helpers'
import { sanitizeInput } from '@/lib/security'
import { validateCNPJ as validateExternalCNPJ } from '@/validate_cnpj_new'

export async function OPTIONS(request) {
	const origin = request.headers.get('origin')
	return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function POST(request) {
	const origin = request.headers.get('origin')
	try {
		const body = await request.json().catch(() => ({}))
		let { cnpj } = body || {}
		cnpj = sanitizeInput(String(cnpj || ''))

		if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
			return handleCORS(NextResponse.json({ valid: false, error: 'CNPJ inválido' }, { status: 400 }), origin)
		}

		const result = await validateExternalCNPJ(cnpj)
		// resultado padronizado
		return handleCORS(NextResponse.json(result), origin)
	} catch (e) {
		return handleCORS(
			NextResponse.json({ valid: false, error: 'Falha na validação de CNPJ' }, { status: 500 }),
			origin
		)
	}
}
