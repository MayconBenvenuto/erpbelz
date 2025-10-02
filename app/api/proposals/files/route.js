import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  supabase,
  handleCORS,
  requireAuth,
  mapSupabaseErrorToStatus,
  supabaseConfigStatus,
} from '@/lib/api-helpers'

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
  const cfg = supabaseConfigStatus()
  // Para listar arquivos e tentar URLs públicas, basta URL + ANON KEY.
  // A Service Role Key é desejável para assinar URLs, mas não obrigatória.
  if (!cfg.hasUrl || !cfg.hasAnonKey) {
    return handleCORS(
      NextResponse.json(
        {
          error:
            'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.',
          config: cfg,
        },
        { status: 503 }
      ),
      origin
    )
  }
  const { searchParams } = new URL(request.url)
  const propostaId = searchParams.get('proposta_id')
  if (!propostaId)
    return handleCORS(
      NextResponse.json({ error: 'proposta_id obrigatório' }, { status: 400 }),
      origin
    )
  let data = []
  let error = null
  try {
    const resp = await supabase
      .from('propostas_arquivos')
      .select('*')
      .eq('proposta_id', propostaId)
      .order('criado_em', { ascending: true })
    data = resp.data || []
    error = resp.error || null
  } catch (e) {
    error = { message: e?.message || 'Erro desconhecido' }
  }
  if (error) {
    const msg = String(error.message || '')
    // Caso a migration ainda não tenha sido aplicada no ambiente atual, evita quebrar a UI.
    if (/propostas_arquivos/i.test(msg) && /not exist|could not find|schema cache/i.test(msg)) {
      // Retorna lista vazia + indicador de fallback
      return handleCORS(NextResponse.json({ data: [], meta: { missingTable: true } }), origin)
    }
    return handleCORS(
      NextResponse.json({ error: error.message }, { status: mapSupabaseErrorToStatus(error) }),
      origin
    )
  }
  // Se não existem metadados ainda (casos antigos), tentar varrer o Storage por prefixo proposta_{codigo}
  let rows = Array.isArray(data) ? data : []
  try {
    if (!rows.length) {
      // Lookup do código da proposta para compor o prefixo de busca no bucket legado
      const { data: prop } = await supabase
        .from('propostas')
        .select('codigo')
        .eq('id', propostaId)
        .single()
      const codigo = prop?.codigo
      if (codigo) {
        const bucket = 'implantacao_upload'
        const prefix = `proposta_${codigo}`
        // Lista diretórios de primeiro nível (categorias) e arquivos diretos
        const { data: level1 } = await supabase.storage
          .from(bucket)
          .list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
        const collected = []
        const pushFiles = (files, base) => {
          for (const f of files || []) {
            // Heurística: se size inexistente, trata como pasta
            if (typeof f.size === 'number') {
              collected.push({
                id: randomUUID(),
                proposta_id: propostaId,
                bucket,
                path: `${base}/${f.name}`,
                nome_original: f.name,
                mime: null,
                tamanho_bytes: f.size,
                uploaded_by: null,
                criado_em: f.created_at || new Date().toISOString(),
              })
            }
          }
        }
        // arquivos diretos em prefix
        pushFiles(
          level1?.filter((x) => typeof x?.size === 'number'),
          prefix
        )
        // subpastas
        const folders = (level1 || []).filter((x) => typeof x?.size !== 'number')
        for (const folder of folders) {
          const base = `${prefix}/${folder.name}`
          const { data: inside } = await supabase.storage
            .from(bucket)
            .list(base, { limit: 200, sortBy: { column: 'name', order: 'asc' } })
          pushFiles(inside, base)
        }
        if (collected.length) rows = collected
      }
    }
  } catch (_) {
    // Fallback silencioso: mantém rows conforme banco
  }

  // Enriquecer com URL pública (ou assinada como fallback) para facilitar consumo no frontend
  try {
    const enriched = await Promise.all(
      (rows || []).map(async (f) => {
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
          const bucket = f.bucket || 'implantacao_upload'
          const path = f.path || ''
          const proxyUrl =
            bucket && path
              ? `/api/proposals/files/proxy?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
              : null
          const downloadUrl = proxyUrl ? `${proxyUrl}&download=1` : null
          return { ...f, url, proxy_url: proxyUrl, download_url: downloadUrl }
        } catch {
          const bucket = f.bucket || 'implantacao_upload'
          const path = f.path || ''
          const proxyUrl =
            bucket && path
              ? `/api/proposals/files/proxy?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
              : null
          const downloadUrl = proxyUrl ? `${proxyUrl}&download=1` : null
          return { ...f, url: null, proxy_url: proxyUrl, download_url: downloadUrl }
        }
      })
    )
    return handleCORS(NextResponse.json({ data: enriched }), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ data: rows }), origin)
  }
}

// POST registra metadados após upload bem sucedido
// Espera { files: [{ proposta_id, path, nome_original, mime, tamanho_bytes, bucket, url, categoria }] }
// ou formato legado { proposta_id, path, nome, mime, tamanho_bytes, bucket }
export async function POST(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error)
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)

  const body = await request.json().catch(() => ({}))

  // Suporte a formato novo (múltiplos arquivos) e legado (arquivo único)
  const files = body.files || (body.proposta_id ? [body] : [])

  if (!files.length) {
    return handleCORS(
      NextResponse.json({ error: 'Nenhum arquivo para registrar' }, { status: 400 }),
      origin
    )
  }

  try {
    const results = []
    const errors = []

    for (const file of files) {
      const {
        proposta_id,
        path,
        nome_original,
        nome, // compatibilidade legada
        mime,
        tamanho_bytes,
        bucket = 'implantacao_upload',
        url,
        categoria,
      } = file

      if (!proposta_id || !path) {
        errors.push({ file, error: 'proposta_id e path são obrigatórios' })
        continue
      }

      const insert = {
        proposta_id,
        path,
        nome_original: nome_original || nome || null,
        mime: mime || null,
        tamanho_bytes: typeof tamanho_bytes === 'number' ? tamanho_bytes : null,
        bucket,
        url: url || null,
        categoria: categoria || null,
        uploaded_by: auth.user.id,
      }

      const { data, error } = await supabase
        .from('propostas_arquivos')
        .insert(insert)
        .select()
        .single()

      if (error) {
        errors.push({ file, error: error.message })
      } else {
        results.push(data)
      }
    }

    // Se houver pelo menos um sucesso, retorna ok
    if (results.length > 0) {
      return handleCORS(
        NextResponse.json({
          success: true,
          data: results,
          errors: errors.length > 0 ? errors : undefined,
        }),
        origin
      )
    }

    // Se todos falharam
    return handleCORS(
      NextResponse.json(
        {
          error: 'Falha ao registrar arquivos',
          errors,
        },
        { status: 400 }
      ),
      origin
    )
  } catch (e) {
    return handleCORS(
      NextResponse.json({ error: 'Erro ao registrar arquivos' }, { status: 500 }),
      origin
    )
  }
}
