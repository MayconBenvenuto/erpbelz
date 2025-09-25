import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'

export const runtime = 'nodejs'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

// GET ?proposta_id= - lista arquivos
export async function GET(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error)
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  const { searchParams } = new URL(request.url)
  const propostaId = searchParams.get('proposta_id')
  if (!propostaId)
    return handleCORS(
      NextResponse.json({ error: 'proposta_id obrigatório' }, { status: 400 }),
      origin
    )
  const { data, error } = await supabase
    .from('propostas_arquivos')
    .select('*')
    .eq('proposta_id', propostaId)
    .order('criado_em', { ascending: true })
  if (error) return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  // Enriquecer com URL pública (ou assinada como fallback) para facilitar consumo no frontend
  try {
    const enriched = await Promise.all(
      (data || []).map(async (f) => {
        try {
          let url = null
          // Primeiro tenta URL pública (caso o bucket seja público)
          const { data: pub } = supabase.storage.from(f.bucket).getPublicUrl(f.path)
          url = pub?.publicUrl || null
          // Se não houver pública, tenta gerar uma URL assinada temporária
          if (!url) {
            const { data: signed } = await supabase.storage
              .from(f.bucket)
              .createSignedUrl(f.path, 600) // 10 minutos
            url = signed?.signedUrl || null
          }
          return { ...f, url }
        } catch {
          return { ...f, url: null }
        }
      })
    )
    return handleCORS(NextResponse.json({ data: enriched }), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ data }), origin)
  }
}

// POST registra metadados após upload bem sucedido
// Espera { proposta_id, path, nome, mime, tamanho_bytes, bucket }
export async function POST(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error)
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  const body = await request.json().catch(() => ({}))
  const { proposta_id, path, nome, mime, tamanho_bytes, bucket = 'implantacao_upload' } = body
  if (!proposta_id || !path) {
    return handleCORS(
      NextResponse.json({ error: 'proposta_id e path são obrigatórios' }, { status: 400 }),
      origin
    )
  }
  try {
    const insert = {
      proposta_id,
      path,
      nome_original: nome || null,
      mime: mime || null,
      tamanho_bytes: typeof tamanho_bytes === 'number' ? tamanho_bytes : null,
      bucket,
      uploaded_by: auth.user.id,
    }
    const { data, error } = await supabase
      .from('propostas_arquivos')
      .insert(insert)
      .select()
      .single()
    if (error)
      return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
    return handleCORS(NextResponse.json(data), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ error: 'Erro ao registrar' }, { status: 500 }), origin)
  }
}
