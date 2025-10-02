import { NextResponse } from 'next/server'
import { handleCORS, requireAuth, supabase, mapSupabaseErrorToStatus, supabaseConfigStatus } from '@/lib/api-helpers'

export const runtime = 'nodejs'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

// GET /api/proposals/files/proxy?bucket=...&path=...
// Redireciona para URL assinada (ou pública) do objeto no Storage
export async function GET(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error)
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)

  const cfg = supabaseConfigStatus()
  if (!cfg.hasUrl || !cfg.hasAnonKey) {
    return handleCORS(
      NextResponse.json(
        { error: 'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.', config: cfg },
        { status: 503 }
      ),
      origin
    )
  }

  const { searchParams } = new URL(request.url)
  const bucket = searchParams.get('bucket')
  const path = searchParams.get('path')
  if (!bucket || !path) {
    return handleCORS(NextResponse.json({ error: 'bucket e path são obrigatórios' }, { status: 400 }), origin)
  }

  try {
    // Primeiro tenta pública
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
    const publicUrl = pub?.publicUrl || null
    if (publicUrl) {
      return handleCORS(NextResponse.redirect(publicUrl, { status: 302 }), origin)
    }
    // Tenta assinada (exige service role ou política adequada no bucket)
    const { data: signed, error } = await supabase.storage.from(bucket).createSignedUrl(path, 600)
    if (error) {
      return handleCORS(
        NextResponse.json({ error: error.message }, { status: mapSupabaseErrorToStatus(error) }),
        origin
      )
    }
    if (!signed?.signedUrl) {
      return handleCORS(NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 }), origin)
    }
    return handleCORS(NextResponse.redirect(signed.signedUrl, { status: 302 }), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ error: 'Falha ao gerar link' }, { status: 500 }), origin)
  }
}
