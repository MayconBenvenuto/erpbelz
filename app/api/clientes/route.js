import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'
import { sanitizeInput } from '@/lib/security'
import { z } from 'zod'
// Importa validação externa (consulta múltiplas APIs) evitando fetch loopback
import { validateCNPJ as externalCNPJLookup } from '../../../validate_cnpj_new'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function GET(request) {
  const origin = request.headers.get('origin')
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim().toLowerCase()
  const filtroConsultor = searchParams.get('consultor_id')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error, code: 'unauthorized' }, { status: auth.status }), origin)
  const user = auth.user
  try {
    let query = supabase
      .from('clientes_consultor')
      .select('id, consultor_id, cnpj, razao_social, responsavel, cargo_responsavel, email_responsavel, whatsapp_responsavel, criado_em, atualizado_em')
      .order('criado_em', { ascending: false })

    // Restrição de visibilidade para consultor
    if (user.tipo_usuario === 'consultor') {
      query = query.eq('consultor_id', user.id)
    } else if (filtroConsultor) {
      // Apenas gestor pode filtrar arbitrariamente
      query = query.eq('consultor_id', filtroConsultor)
    }

    if (q) {
      // Filtro simples client-side será aplicado depois (supabase sem ilike múltiplo OR fácil aqui)
      const { data, error } = await query
      if (error) return handleCORS(NextResponse.json({ error: error.message, code: 'db_error' }, { status: 500 }), origin)
      const filtered = (data || []).filter(r => [r.cnpj, r.razao_social, r.responsavel, r.email_responsavel].some(v => (v || '').toLowerCase().includes(q)))
      return handleCORS(NextResponse.json(filtered), origin)
    }

    const { data, error } = await query
    if (error) return handleCORS(NextResponse.json({ error: error.message, code: 'db_error' }, { status: 500 }), origin)
    return handleCORS(NextResponse.json(data || []), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ error: 'Falha ao carregar clientes', code: 'unexpected' }, { status: 500 }), origin)
  }
}

const createSchema = z.object({
  cnpj: z.string().min(14),
  razao_social: z.string().optional(),
  responsavel: z.string().min(2),
  cargo_responsavel: z.string().optional(),
  email_responsavel: z.string().email(),
  whatsapp_responsavel: z.string().optional(),
  consultor_id: z.string().uuid().optional() // gestor pode especificar
})

export async function POST(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  const user = auth.user
  try {
    const body = await request.json().catch(()=>({}))
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return handleCORS(NextResponse.json({ error: 'Dados inválidos', issues: parsed.error.issues }, { status: 400 }), origin)

    const dataIn = parsed.data
    const rawDigits = String(dataIn.cnpj).replace(/\D/g,'')
    if (rawDigits.length !== 14) return handleCORS(NextResponse.json({ error: 'CNPJ inválido', code: 'invalid_cnpj' }, { status: 400 }), origin)

    // Validação externa (multi-provider). Não bloqueia se serviços externos indisponíveis mas exige valid=true.
    const result = await externalCNPJLookup(rawDigits)
    if (!result.valid) {
      return handleCORS(NextResponse.json({ error: result.error || 'Falha na validação de CNPJ', code: 'cnpj_lookup_failed' }, { status: 400 }), origin)
    }
    if (result.data?.razao_social && !dataIn.razao_social) dataIn.razao_social = result.data.razao_social

    // Validação whatsapp básica se informado
    if (dataIn.whatsapp_responsavel) {
      const digitsWpp = dataIn.whatsapp_responsavel.replace(/\D/g,'')
      if (digitsWpp.length < 10 || digitsWpp.length > 13) {
        return handleCORS(NextResponse.json({ error: 'Whatsapp inválido', code: 'invalid_whatsapp' }, { status: 400 }), origin)
      }
      dataIn.whatsapp_responsavel = digitsWpp
    }

    const record = {
      consultor_id: user.tipo_usuario === 'gestor' ? (dataIn.consultor_id || user.id) : user.id,
      cnpj: rawDigits,
      razao_social: sanitizeInput(dataIn.razao_social || ''),
      responsavel: sanitizeInput(dataIn.responsavel),
      cargo_responsavel: sanitizeInput(dataIn.cargo_responsavel || ''),
      email_responsavel: sanitizeInput(dataIn.email_responsavel),
      whatsapp_responsavel: sanitizeInput(dataIn.whatsapp_responsavel || ''),
    }

    const { data, error } = await supabase.from('clientes_consultor').insert(record).select('id, consultor_id, cnpj, razao_social, responsavel, cargo_responsavel, email_responsavel, whatsapp_responsavel, criado_em, atualizado_em').single()
    if (error) {
      if (error.code === '23505') {
        return handleCORS(NextResponse.json({ error: 'Já existe cliente com este CNPJ para este consultor', code: 'duplicate' }, { status: 409 }), origin)
      }
      return handleCORS(NextResponse.json({ error: error.message, code: 'db_error' }, { status: 500 }), origin)
    }
    return handleCORS(NextResponse.json(data), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ error: 'Falha ao criar cliente', code: 'unexpected' }, { status: 500 }), origin)
  }
}

// Schema para atualização (não permite alterar CNPJ por simplicidade / integridade)
const patchSchema = z.object({
  id: z.string().uuid(),
  razao_social: z.string().optional(),
  responsavel: z.string().min(2).optional(),
  cargo_responsavel: z.string().optional(),
  email_responsavel: z.string().email().optional(),
  whatsapp_responsavel: z.string().optional()
})

export async function PATCH(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  const user = auth.user
  try {
    const body = await request.json().catch(()=>({}))
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return handleCORS(NextResponse.json({ error: 'Dados inválidos', issues: parsed.error.issues, code: 'invalid_body' }, { status: 400 }), origin)
    const dataIn = parsed.data

    // Busca registro para verificação de propriedade
    const { data: existente, error: errSel } = await supabase.from('clientes_consultor').select('id, consultor_id').eq('id', dataIn.id).single()
    if (errSel?.code === 'PGRST116' || (!existente && !errSel)) {
      return handleCORS(NextResponse.json({ error: 'Não encontrado', code: 'not_found' }, { status: 404 }), origin)
    }
    if (errSel && errSel.code !== 'PGRST116') {
      return handleCORS(NextResponse.json({ error: errSel.message, code: 'db_error' }, { status: 500 }), origin)
    }
    if (!existente) {
      return handleCORS(NextResponse.json({ error: 'Não encontrado', code: 'not_found' }, { status: 404 }), origin)
    }
    if (user.tipo_usuario === 'consultor' && existente.consultor_id !== user.id) {
      return handleCORS(NextResponse.json({ error: 'Proibido', code: 'forbidden' }, { status: 403 }), origin)
    }

    const updates = {}
    if (dataIn.razao_social !== undefined) updates.razao_social = sanitizeInput(dataIn.razao_social)
    if (dataIn.responsavel !== undefined) updates.responsavel = sanitizeInput(dataIn.responsavel)
    if (dataIn.cargo_responsavel !== undefined) updates.cargo_responsavel = sanitizeInput(dataIn.cargo_responsavel)
    if (dataIn.email_responsavel !== undefined) updates.email_responsavel = sanitizeInput(dataIn.email_responsavel)
    if (dataIn.whatsapp_responsavel !== undefined) {
      if (dataIn.whatsapp_responsavel) {
        const digitsWpp = dataIn.whatsapp_responsavel.replace(/\D/g,'')
        if (digitsWpp.length < 10 || digitsWpp.length > 13) {
          return handleCORS(NextResponse.json({ error: 'Whatsapp inválido', code: 'invalid_whatsapp' }, { status: 400 }), origin)
        }
        updates.whatsapp_responsavel = sanitizeInput(digitsWpp)
      } else {
        updates.whatsapp_responsavel = ''
      }
    }

    if (Object.keys(updates).length === 0) {
      return handleCORS(NextResponse.json({ error: 'Nada para atualizar', code: 'no_changes' }, { status: 400 }), origin)
    }

    const { data, error } = await supabase
      .from('clientes_consultor')
      .update(updates)
      .eq('id', dataIn.id)
      .select('id, consultor_id, cnpj, razao_social, responsavel, cargo_responsavel, email_responsavel, whatsapp_responsavel, criado_em, atualizado_em')
      .single()

    if (error) {
      return handleCORS(NextResponse.json({ error: error.message, code: 'db_error' }, { status: 500 }), origin)
    }
    return handleCORS(NextResponse.json(data), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ error: 'Falha ao atualizar cliente', code: 'unexpected' }, { status: 500 }), origin)
  }
}
