import { NextResponse } from 'next/server'
import { verifyToken, sanitizeForLog } from '@/lib/security'
import { supabase } from '@/lib/api-helpers'

export const runtime = 'nodejs'

const BUCKET = 'movimentacao_upload'

export async function POST(req) {
  try {
    let token = null
    const auth = req.headers.get('authorization')
    if (auth && auth.startsWith('Bearer ')) token = auth.replace('Bearer ', '')
    if (!token) {
      // tenta extrair do cookie crm_auth (sessão baseada em cookie)
      const cookieHeader = req.headers.get('cookie') || ''
      const match = cookieHeader.split(/;\s*/).find(c => c.startsWith('crm_auth='))
      if (match) token = decodeURIComponent(match.split('=')[1] || '')
    }
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ message: 'Token inválido' }, { status: 401 })

    // Verificações básicas de configuração (evitam tentativa de upload inútil)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ message: 'Configuração Supabase ausente (.env)' }, { status: 500 })
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'Arquivo ausente' }, { status: 400 })
    }

    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ]
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ message: 'Tipo de arquivo não permitido' }, { status: 400 })
    }
    if (file.size > 7 * 1024 * 1024) {
      return NextResponse.json({ message: 'Arquivo excede 7MB' }, { status: 400 })
    }

  const ext = file.name.split('.').pop()?.toLowerCase()
    const path = `${user.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Verificação opcional de existência do bucket.
    // Observação: getBucket exige service role para retornar metadados; com apenas ANON pode retornar 404/Not Found
    // dando a impressão de bucket inexistente. Portanto só validamos estritamente se houver SERVICE_ROLE.
    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    if (hasServiceRole) {
      try {
        const { data: bucketInfo, error: bucketErr } = await supabase.storage.getBucket(BUCKET)
        if (bucketErr) {
          const msg = bucketErr.message?.toLowerCase() || ''
          const indicativeNotFound = ['not found', 'no such bucket', 'não encontrado'].some(k => msg.includes(k))
          if (indicativeNotFound) {
            return NextResponse.json({ message: `Bucket '${BUCKET}' aparenta não existir (getBucket). Verifique no painel Storage.` }, { status: 500 })
          }
          // Outros erros apenas logamos (permission / policy etc.) e seguimos para tentar upload
          // eslint-disable-next-line no-console
          console.warn('[UPLOAD][BUCKET-CHECK] Erro getBucket (ignorado para prosseguir upload)', msg)
        } else if (!bucketInfo) {
          return NextResponse.json({ message: `Bucket '${BUCKET}' não acessível (sem metadados).` }, { status: 500 })
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[UPLOAD][BUCKET-CHECK] Exceção ignorada em getBucket', e?.message)
      }
    }

    const arrayBuffer = await file.arrayBuffer()
    const { error } = await supabase.storage.from(BUCKET).upload(path, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false
    })
    if (error) {
      // Erros comuns: duplicate, permission, exceeded quota
      return NextResponse.json({ message: `Erro storage: ${error.message}` }, { status: 500 })
    }
    let publicUrl = null
    try {
      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      publicUrl = publicUrlData?.publicUrl || null
    } catch {}
    // Signed URL fallback (1 hora)
    if (!publicUrl) {
      try {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
        publicUrl = signed?.signedUrl || null
      } catch {}
    }
    return NextResponse.json({ path, nome: file.name, tipo: file.type, url: publicUrl, signed: !publicUrl, bucket: BUCKET })
  } catch (e) {
    console.error('[UPLOAD][SOLICITACOES] Falha inesperada', sanitizeForLog({ message: e?.message, stack: e?.stack }))
    return NextResponse.json({ message: 'Erro upload inesperado' }, { status: 500 })
  }
}
