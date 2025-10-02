import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth, mapSupabaseErrorToStatus, supabaseConfigStatus } from '@/lib/api-helpers'
import { sanitizeInput } from '@/lib/security'

export const runtime = 'nodejs'

export async function OPTIONS(request){
  return handleCORS(new NextResponse(null,{status:200}), request.headers.get('origin'))
}

// GET ?proposta_id=uuid
export async function GET(request){
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  const cfg = supabaseConfigStatus()
  if (!cfg.hasUrl || !(cfg.hasAnonKey || cfg.hasServiceRoleKey)) {
    return handleCORS(
      NextResponse.json(
        { error: 'Supabase não configurado para runtime', config: cfg },
        { status: 503 }
      ),
      origin
    )
  }
  const { searchParams } = new URL(request.url)
  const proposta_id = searchParams.get('proposta_id')
  if (!proposta_id) return handleCORS(NextResponse.json({ error: 'proposta_id obrigatório' }, { status:400}), origin)
  const { data, error } = await supabase.from('propostas_notas').select('id, proposta_id, autor_id, nota, criado_em').eq('proposta_id', proposta_id).order('criado_em',{ascending:false})
  if (error) return handleCORS(NextResponse.json({ error: error.message }, { status: mapSupabaseErrorToStatus(error)}), origin)
  return handleCORS(NextResponse.json(data), origin)
}

// POST { proposta_id, nota }
export async function POST(request){
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  if (auth.user.tipo_usuario === 'consultor') return handleCORS(NextResponse.json({ error: 'Sem permissão' }, { status:403}), origin)
  const cfg = supabaseConfigStatus()
  if (!cfg.hasUrl || !(cfg.hasAnonKey || cfg.hasServiceRoleKey)) {
    return handleCORS(
      NextResponse.json(
        { error: 'Supabase não configurado para runtime', config: cfg },
        { status: 503 }
      ),
      origin
    )
  }
  const body = await request.json().catch(()=>null)
  if (!body?.proposta_id || !body?.nota) return handleCORS(NextResponse.json({ error: 'Dados incompletos' }, { status:400}), origin)
  const sanitized = sanitizeInput(body.nota).slice(0,2000)
  const { data: inserted, error } = await supabase.from('propostas_notas').insert({ proposta_id: body.proposta_id, autor_id: auth.user.id, nota: sanitized }).select().single()
  if (error) return handleCORS(NextResponse.json({ error: error.message }, { status: mapSupabaseErrorToStatus(error)}), origin)
  return handleCORS(NextResponse.json(inserted), origin)
}
