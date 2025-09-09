import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabase, handleCORS } from '@/lib/api-helpers'
import { validateEmail, sanitizeForLog, hashPassword } from '@/lib/security'

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

// POST { email, code, resetToken, novaSenha }
export async function POST(request) {
  const origin = request.headers.get('origin')
  try {
    const { email, code, resetToken, novaSenha } = await request.json()
    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase()
    const codeStr = String(code || '').trim()
    const resetTokenStr = String(resetToken || '').trim()
    const nova = String(novaSenha || '').trim()
    if (!validateEmail(cleanEmail) || !/^[0-9]{6}$/.test(codeStr) || resetTokenStr.length < 10) {
      return handleCORS(NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }), origin)
    }
    if (nova.length < 8) {
      return handleCORS(
        NextResponse.json({ error: 'Senha muito curta (mín 8)' }, { status: 400 }),
        origin
      )
    }
    if (
      !/[A-ZÁÉÍÓÚÂÊÔÃÕÄËÏÖÜ]/.test(nova) ||
      !/[a-záéíóúâêôãõäëïöü]/.test(nova) ||
      !/\d/.test(nova)
    ) {
      return handleCORS(
        NextResponse.json(
          { error: 'Senha deve conter maiúscula, minúscula e dígito' },
          { status: 400 }
        ),
        origin
      )
    }
    const nowIso = new Date().toISOString()
    const { data: resets, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('email', cleanEmail)
      .is('used_at', null)
      .gte('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error || !resets?.length) {
      return handleCORS(
        NextResponse.json({ error: 'Código expirado ou inválido' }, { status: 400 }),
        origin
      )
    }
    const pr = resets[0]
    if (pr.attempts >= 8) {
      return handleCORS(NextResponse.json({ error: 'Muitas tentativas' }, { status: 429 }), origin)
    }
    const bcrypt = await import('bcryptjs')
    const codeOk = await bcrypt.compare(codeStr, pr.code_hash)
    if (!codeOk) {
      await supabase
        .from('password_resets')
        .update({ attempts: pr.attempts + 1 })
        .eq('id', pr.id)
      return handleCORS(NextResponse.json({ error: 'Código inválido' }, { status: 400 }), origin)
    }
    if (!pr.reset_token_hash) {
      return handleCORS(
        NextResponse.json({ error: 'Código não verificado' }, { status: 400 }),
        origin
      )
    }
    const providedHash = crypto.createHash('sha256').update(resetTokenStr).digest('hex')
    if (providedHash !== pr.reset_token_hash) {
      return handleCORS(NextResponse.json({ error: 'Token inválido' }, { status: 400 }), origin)
    }
    // Atualiza senha
    const { data: userRow, error: userErr } = await supabase
      .from('usuarios')
      .select('id,senha')
      .eq('email', cleanEmail)
      .single()
    if (userErr || !userRow) {
      return handleCORS(
        NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 }),
        origin
      )
    }
    const same = await bcrypt.compare(nova, userRow.senha)
    if (same)
      return handleCORS(
        NextResponse.json({ error: 'Nova senha não pode ser igual à anterior' }, { status: 400 }),
        origin
      )
    const hashed = await hashPassword(nova)
    const { error: updErr } = await supabase
      .from('usuarios')
      .update({ senha: hashed, must_change_password: false, senha_alterada_em: nowIso })
      .eq('id', userRow.id)
    if (updErr)
      return handleCORS(
        NextResponse.json({ error: 'Falha ao atualizar senha' }, { status: 500 }),
        origin
      )
    await supabase.from('password_resets').update({ used_at: nowIso }).eq('id', pr.id)
    return handleCORS(NextResponse.json({ success: true }), origin)
  } catch (e) {
    console.error('ForgotPwd reset error', sanitizeForLog({ message: e?.message }))
    return handleCORS(NextResponse.json({ error: 'Erro na redefinição' }, { status: 500 }), origin)
  }
}
