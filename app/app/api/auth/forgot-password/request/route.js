import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabase, handleCORS } from '@/lib/api-helpers'
import { validateEmail, sanitizeForLog, checkRateLimit } from '@/lib/security'
import { sendEmail } from '@/lib/email'
import { renderBrandedEmail } from '@/lib/email-template'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

// POST { email }
export async function POST(request) {
  const origin = request.headers.get('origin')
  try {
    const { email } = await request.json()
    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase()
    if (!validateEmail(cleanEmail)) {
      return handleCORS(NextResponse.json({ error: 'Email inválido' }, { status: 400 }), origin)
    }
    // Rate limit básico por IP+email
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'ip:unknown'
    const rlKey = `pwdreset:${ip}:${cleanEmail}`
    if (!checkRateLimit(rlKey)) {
      return handleCORS(
        NextResponse.json({ error: 'Muitas tentativas, tente mais tarde' }, { status: 429 }),
        origin
      )
    }

    // Verifica se usuário existe (não expõe detalhe específico em resposta)
    const { data: user, error: userErr } = await supabase
      .from('usuarios')
      .select('id,email,nome')
      .eq('email', cleanEmail)
      .single()
    if (userErr || !user) {
      // Resposta genérica (evita enumeração) — usuário pediu validação; ainda assim manter segurança
      return handleCORS(NextResponse.json({ success: true }), origin)
    }

    // Limpa resets anteriores muito recentes (pode manter histórico; aqui apenas controla spam)
    const { data: recent } = await supabase
      .from('password_resets')
      .select('id,created_at')
      .eq('email', cleanEmail)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())
      .limit(1)
    if (recent && recent.length) {
      return handleCORS(NextResponse.json({ success: true }), origin)
    }

    const code = String(Math.floor(100000 + Math.random() * 900000)) // 6 dígitos
    // Hash com bcrypt rounds padrão (via supabase compute)? usaremos import dinam.
    const bcrypt = await import('bcryptjs')
    const code_hash = await bcrypt.hash(code, 10)
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

    await supabase.from('password_resets').insert({ email: cleanEmail, code_hash, expires_at })

    // Envia e-mail com código (silencioso em caso de falha)
    try {
      const firstName = (user?.nome || '').split(' ')[0] || ''
      const html = renderBrandedEmail({
        title: 'Código de recuperação de senha',
        contentHtml: `<p>Olá${firstName ? ' ' + firstName : ''},</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p>Use o código abaixo dentro de <strong>15 minutos</strong>:</p>
          <p style="font-size:24px;letter-spacing:4px;font-weight:700;background:#021d79;color:#fff;display:inline-block;padding:8px 18px;border-radius:8px;">${code}</p>
          <p>Se você não solicitou, ignore este e-mail. Nenhuma ação será realizada.</p>`,
      })
      await sendEmail({ to: user.email, subject: '[Belz] Código para redefinição de senha', html })
    } catch (e) {
      try {
        console.warn('ForgotPwd email fail', sanitizeForLog({ message: e?.message }))
      } catch {}
    }

    return handleCORS(NextResponse.json({ success: true }), origin)
  } catch (e) {
    console.error('ForgotPwd request error', sanitizeForLog({ message: e?.message }))
    return handleCORS(NextResponse.json({ error: 'Erro na solicitação' }, { status: 500 }), origin)
  }
}
