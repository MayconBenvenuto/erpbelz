import { NextResponse } from 'next/server'
import { verifyToken, sanitizeForLog } from '@/lib/security'
import { supabase } from '@/lib/api-helpers'

export const runtime = 'nodejs'

const BUCKET = 'movimentacao_upload'
const ALLOWED = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv'
]
const MAX_BYTES = 7 * 1024 * 1024 // 7MB

export async function POST(req) {
  try {
    // auth (mesma abordagem das outras rotas)
    let token = null
    const auth = req.headers.get('authorization')
    if (auth?.startsWith('Bearer ')) token = auth.slice(7)
    if (!token) {
      const cookieHeader = req.headers.get('cookie') || ''
      const match = cookieHeader.split(/;\s*/).find(c => c.startsWith('crm_auth='))
      if (match) token = decodeURIComponent(match.split('=')[1] || '')
    }
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ message: 'Token inválido' }, { status: 401 })

    // exige service role para gerar signed upload url (caso contrário erro 401/permission)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ message: 'SERVICE_ROLE ausente para gerar URL assinada' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const { filename, mime, size } = body
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ message: 'filename obrigatório' }, { status: 400 })
    }
    if (!mime || !ALLOWED.includes(mime)) {
      return NextResponse.json({ message: 'MIME inválido' }, { status: 400 })
    }
    if (typeof size !== 'number' || size <= 0 || size > MAX_BYTES) {
      return NextResponse.json({ message: 'Tamanho inválido' }, { status: 400 })
    }

    const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0,150)
    const ext = (safeName.split('.').pop() || '').toLowerCase() || mime.split('/').pop() || 'bin'
    const path = `${user.userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path, 60) // 60s
    if (error) {
      return NextResponse.json({ message: `Erro signed url: ${error.message}` }, { status: 500 })
    }
    return NextResponse.json({
      bucket: BUCKET,
      path,
      token: data?.token,
      signedUrl: data?.signedUrl,
      expiresIn: 60,
      maxBytes: MAX_BYTES,
      mime
    })
  } catch (e) {
    console.error('[SIGNED-UPLOAD] Falha', sanitizeForLog({ message: e?.message, stack: e?.stack }))
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
