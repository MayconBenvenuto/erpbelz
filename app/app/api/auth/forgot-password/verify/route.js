import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabase, handleCORS } from '@/lib/api-helpers'
import { validateEmail, sanitizeForLog } from '@/lib/security'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

// POST { email, code }
export async function POST(request) {
  const origin = request.headers.get('origin')
  try {
    const { email, code } = await request.json()
    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase()
    const codeStr = String(code || '').trim()
    if (!validateEmail(cleanEmail) || !/^[0-9]{6}$/.test(codeStr)) {
      return handleCORS(NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }), origin)
    }
    const nowIso = new Date().toISOString()
    // Busca reset mais recente ainda válido e não usado
    const { data: resets, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('email', cleanEmail)
      .is('used_at', null)
      .gte('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error || !resets?.length) {
      return handleCORS(NextResponse.json({ error: 'Código inválido' }, { status: 400 }), origin)
    }
    const pr = resets[0]
    if (pr.attempts >= 6) {
      return handleCORS(NextResponse.json({ error: 'Muitas tentativas' }, { status: 429 }), origin)
    }
    const bcrypt = await import('bcryptjs')
    const ok = await bcrypt.compare(codeStr, pr.code_hash)
    await supabase
      .from('password_resets')
      .update({
        attempts: pr.attempts + 1 + (ok ? 0 : 0),
        verified_at: ok ? nowIso : pr.verified_at,
      })
      .eq('id', pr.id)
    if (!ok) {
      return handleCORS(NextResponse.json({ error: 'Código inválido' }, { status: 400 }), origin)
    }
    // Gera reset token e guarda hash
    const resetToken = crypto.randomBytes(24).toString('hex')
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
    await supabase
      .from('password_resets')
      .update({ reset_token_hash: resetTokenHash })
      .eq('id', pr.id)
    return handleCORS(NextResponse.json({ success: true, resetToken }), origin)
  } catch (e) {
    console.error('ForgotPwd verify error', sanitizeForLog({ message: e?.message }))
    return handleCORS(NextResponse.json({ error: 'Erro na verificação' }, { status: 500 }), origin)
  }
}
