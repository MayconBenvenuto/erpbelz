import { NextResponse } from 'next/server'
import { handleCORS, requireAuth, supabase } from '@/lib/api-helpers'
import { hashPassword, verifyPassword } from '@/lib/security'
import { sendEmail } from '@/lib/email'
import { renderBrandedEmail } from '@/lib/email-template'

export async function OPTIONS(request){
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null,{status:200}), origin)
}

// POST { atual?: string, nova: string }
export async function POST(request){
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  try {
    const body = await request.json()
    const nova = String(body?.nova || '').trim()
    const atual = body?.atual ? String(body.atual).trim() : null
    if (nova.length < 8) {
      return handleCORS(NextResponse.json({ error: 'Senha muito curta (mín 8)' }, { status: 400 }), origin)
    }
    if (!/[A-ZÁÉÍÓÚÂÊÔÃÕÄËÏÖÜ]/.test(nova) || !/[a-záéíóúâêôãõäëïöü]/.test(nova) || !/\d/.test(nova)) {
      return handleCORS(NextResponse.json({ error: 'Senha deve conter maiúscula, minúscula e dígito' }, { status: 400 }), origin)
    }
    // Buscar hash atual + flag
    const { data: userRow, error } = await supabase.from('usuarios').select('id, senha, must_change_password').eq('id', auth.user.id).single()
    if (error || !userRow) {
      return handleCORS(NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 }), origin)
    }
    // Se não for primeira troca exigir senha atual correta
    if (!userRow.must_change_password) {
      if (!atual) {
        return handleCORS(NextResponse.json({ error: 'Senha atual requerida' }, { status: 400 }), origin)
      }
      const ok = await verifyPassword(atual, userRow.senha)
      if (!ok) return handleCORS(NextResponse.json({ error: 'Senha atual incorreta' }, { status: 401 }), origin)
    } else {
      // primeira troca: se forneceu atual, opcional validar, senão ignora
      if (atual) {
        const ok = await verifyPassword(atual, userRow.senha)
        if (!ok) return handleCORS(NextResponse.json({ error: 'Senha inicial incorreta' }, { status: 401 }), origin)
      }
    }
    // Evitar reutilização imediata
    const same = await verifyPassword(nova, userRow.senha)
    if (same) return handleCORS(NextResponse.json({ error: 'Nova senha não pode ser igual à anterior' }, { status: 400 }), origin)

    const hashed = await hashPassword(nova)
    const when = new Date().toISOString()
    const { error: updErr } = await supabase.from('usuarios').update({ senha: hashed, must_change_password: false, senha_alterada_em: when }).eq('id', auth.user.id)
    if (updErr) return handleCORS(NextResponse.json({ error: 'Falha ao atualizar senha' }, { status: 500 }), origin)

    // Email de confirmação (silencioso em caso de falha)
    try {
      const { data: u } = await supabase.from('usuarios').select('email,nome').eq('id', auth.user.id).single()
      if (u?.email) {
        const html = renderBrandedEmail({
          title: 'Senha alterada com sucesso',
          contentHtml: `<p>Olá${u?.nome ? ' ' + u.nome.split(' ')[0] : ''},</p>
          <p>Confirmamos que a senha da sua conta foi alterada com sucesso em <strong>${new Date(when).toLocaleString('pt-BR')}</strong>.</p>
          <p>Se não foi você, entre em contato imediatamente com o suporte.</p>`
        })
        await sendEmail({ to: u.email, subject: '[Belz] Confirmação de alteração de senha', html })
      }
    } catch {}

    return handleCORS(NextResponse.json({ success: true }), origin)
  } catch {
    return handleCORS(NextResponse.json({ error: 'Erro na troca de senha' }, { status: 500 }), origin)
  }
}
