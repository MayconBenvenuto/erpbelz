import { NextResponse } from 'next/server'
import {
  handleCORS,
  requireAuth,
  supabase,
  mapSupabaseErrorToStatus,
  supabaseConfigStatus,
} from '@/lib/api-helpers'
import { sanitizeForLog } from '@/lib/security'

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
  const bucket = searchParams.get('bucket')
  const path = searchParams.get('path')
  if (!bucket || !path) {
    return handleCORS(
      NextResponse.json({ error: 'bucket e path são obrigatórios' }, { status: 400 }),
      origin
    )
  }

  const downloadRequested = (() => {
    const download = searchParams.get('download') || searchParams.get('mode')
    if (!download) return false
    return ['1', 'true', 'download'].includes(download.toLowerCase())
  })()

  const filenameParam = searchParams.get('filename')
  const inline = searchParams.get('inline') === '1'

  try {
    if (downloadRequested) {
      const { data: file, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(path)
      if (downloadError || !file) {
        const errPayload = downloadError || { message: 'Arquivo não encontrado' }
        // eslint-disable-next-line no-console
        console.error(
          '[API][proposals:files:proxy][download]',
          sanitizeForLog({
            bucket,
            path,
            error: errPayload?.message,
            name: errPayload?.name,
          })
        )
        const status = mapSupabaseErrorToStatus(errPayload)
        return handleCORS(
          NextResponse.json(
            { error: errPayload?.message || 'Falha ao baixar arquivo' },
            { status }
          ),
          origin
        )
      }

      try {
        const arrayBuffer = await file.arrayBuffer?.()
        const buffer = arrayBuffer ? Buffer.from(arrayBuffer) : Buffer.from([])
        const contentType = file?.type || 'application/octet-stream'
        const filename = filenameParam || path.split('/').pop() || 'arquivo'
        const dispositionType = inline ? 'inline' : 'attachment'
        const res = new NextResponse(buffer, { status: 200 })
        res.headers.set('Content-Type', contentType)
        res.headers.set('Content-Length', buffer.length.toString())
        res.headers.set(
          'Content-Disposition',
          `${dispositionType}; filename*=UTF-8''${encodeURIComponent(filename)}`
        )
        return handleCORS(res, origin)
      } catch (conversionError) {
        // eslint-disable-next-line no-console
        console.error(
          '[API][proposals:files:proxy][downloadConversion]',
          sanitizeForLog({
            bucket,
            path,
            error: conversionError?.message,
            name: conversionError?.name,
          })
        )
        return handleCORS(
          NextResponse.json({ error: 'Falha ao processar arquivo para download' }, { status: 500 }),
          origin
        )
      }
    }

    // Primeiro tenta pública
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
    const publicUrl = pub?.publicUrl || null
    if (publicUrl) {
      return handleCORS(NextResponse.redirect(publicUrl, { status: 302 }), origin)
    }
    // Tenta assinada (exige service role ou política adequada no bucket)
    const { data: signed, error } = await supabase.storage.from(bucket).createSignedUrl(path, 600)
    if (error) {
      // eslint-disable-next-line no-console
      console.error(
        '[API][proposals:files:proxy][signedUrl]',
        sanitizeForLog({
          bucket,
          path,
          error: error?.message,
          name: error?.name,
        })
      )
      return handleCORS(
        NextResponse.json({ error: error.message }, { status: mapSupabaseErrorToStatus(error) }),
        origin
      )
    }
    if (!signed?.signedUrl) {
      return handleCORS(
        NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 }),
        origin
      )
    }
    return handleCORS(NextResponse.redirect(signed.signedUrl, { status: 302 }), origin)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      '[API][proposals:files:proxy][unexpected]',
      sanitizeForLog({
        bucket,
        path,
        error: e?.message,
        name: e?.name,
      })
    )
    return handleCORS(NextResponse.json({ error: 'Falha ao gerar link' }, { status: 500 }), origin)
  }
}
