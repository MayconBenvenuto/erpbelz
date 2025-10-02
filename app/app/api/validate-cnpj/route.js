import { NextResponse } from 'next/server'
import { handleCORS } from '@/lib/api-helpers'
import { sanitizeInput } from '@/lib/security'
import { validateCNPJ as validateExternalCNPJ } from '@/validate_cnpj_new'

// Cache simples em memória (reinicia a cada cold start) para reduzir chamadas externas repetidas
const cache = new Map() // key: cnpjDigits -> { timestamp, result }
const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutos

function basicCnpjCheck(cnpjDigits) {
	if (!/^[0-9]{14}$/.test(cnpjDigits)) return false
	if (/^([0-9])\1{13}$/.test(cnpjDigits)) return false // todos iguais
	// cálculo dígitos verificadores
	const calc = (base) => {
		let size = base.length
		let numbers = base.split('').map(n=>parseInt(n,10))
		let pos = size - 7
		let sum = 0
		for (let i = size; i >= 1; i--) {
			sum += numbers[size - i] * pos--
			if (pos < 2) pos = 9
		}
		const result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
		return result
	}
	const digits = cnpjDigits.slice(0,12)
	const dv1 = calc(digits)
	if (dv1 !== parseInt(cnpjDigits[12],10)) return false
	const dv2 = calc(cnpjDigits.slice(0,12) + dv1)
	if (dv2 !== parseInt(cnpjDigits[13],10)) return false
	return true
}

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
		const digits = cnpj.replace(/\D/g,'')

		if (!digits || digits.length !== 14) {
			return handleCORS(NextResponse.json({ valid: false, error: 'CNPJ inválido' }, { status: 400 }), origin)
		}
		if (!basicCnpjCheck(digits)) {
			return handleCORS(NextResponse.json({ valid: false, error: 'CNPJ inválido (DV)' }, { status: 400 }), origin)
		}

		// Cache hit
		const cached = cache.get(digits)
		if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
			return handleCORS(NextResponse.json(cached.result), origin)
		}

		let result
		try {
			result = await validateExternalCNPJ(digits)
		} catch (err) {
			// Nunca lançar para evitar 500; retornar resposta consistente
			result = { valid: false, error: 'Serviço externo indisponível' }
		}

		cache.set(digits, { timestamp: Date.now(), result })
		return handleCORS(NextResponse.json(result), origin)
	} catch (e) {
		return handleCORS(
			NextResponse.json({ valid: false, error: 'Falha na validação de CNPJ' }, { status: 500 }),
			origin
		)
	}
}
