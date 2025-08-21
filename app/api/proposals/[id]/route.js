import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { supabase, handleCORS, requireAuth, ensureGestor } from '@/lib/api-helpers'
import { sendEmail } from '@/lib/email'
import { sanitizeForLog } from '@/lib/security'
import { renderBrandedEmail } from '@/lib/email-template'
import { formatCurrency, formatCNPJ } from '@/lib/utils'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.string().min(2),
  criado_por: z.string().uuid().optional(),
  valor: z.coerce.number().optional(),
})

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

export async function DELETE(request, { params }) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }
  const guard = ensureGestor(auth.user)
  if (guard) return handleCORS(NextResponse.json(guard, { status: guard.status }), origin)

  const { id } = params

  const { error } = await supabase.from('propostas').delete().eq('id', id)
  if (error) {
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  }

  return handleCORS(NextResponse.json({ success: true }), origin)
}

// PATCH para atualização parcial (ex.: apenas status)
export async function PATCH(request, { params }) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }

  const { id } = params
  const body = await request.json()
  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return handleCORS(
      NextResponse.json({ error: 'Dados inválidos', issues: parsed.error.issues }, { status: 400 }),
      origin
    )
  }

  const { status, criado_por: _criado_por_unused, valor } = parsed.data

  // Busca a proposta e checa autorização:
  // - Gestor pode alterar qualquer
  // - Analista pode alterar apenas se for o criador
  // - Consultor NÃO pode alterar
  const { data: currentProposal, error: fetchError } = await supabase
    .from('propostas')
    .select('id, codigo, criado_por, valor, status, cnpj, operadora, consultor, consultor_email')
    .eq('id', id)
    .single()
  if (fetchError || !currentProposal) {
    try { console.warn('[PROPOSALS] PATCH not found', { id, fetchError: fetchError?.message }) } catch {}
    return handleCORS(NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 }), origin)
  }
  if (auth.user.tipo_usuario === 'consultor') {
    try { console.warn('[PROPOSALS] PATCH forbidden for consultor', { id, by: auth.user.id }) } catch {}
    return handleCORS(NextResponse.json({ error: 'Sem permissão para alterar esta proposta' }, { status: 403 }), origin)
  }
  if (auth.user.tipo_usuario !== 'gestor' && currentProposal.criado_por !== auth.user.id) {
    try { console.warn('[PROPOSALS] PATCH forbidden', { id, by: auth.user.id }) } catch {}
    return handleCORS(NextResponse.json({ error: 'Sem permissão para alterar esta proposta' }, { status: 403 }), origin)
  }

  let updateQuery = supabase
    .from('propostas')
    .update({ status })
    .eq('id', id)

  if (auth.user.tipo_usuario !== 'gestor') {
    updateQuery = updateQuery.eq('criado_por', auth.user.id)
  }

  const { data: updated, error } = await updateQuery.select().single()

  if (error) {
    try { console.error('[PROPOSALS] PATCH update error', { id, error: error?.message }) } catch {}
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  }
  if (!updated) {
    try { console.error('[PROPOSALS] PATCH no updated row', { id }) } catch {}
    return handleCORS(NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), origin)
  }

  // Atualização de metas (delta) baseada em transição de status
  try {
    const wasImplantado = String(currentProposal.status) === 'implantado'
    const willImplantado = String(status) === 'implantado'

    // Só aplica delta quando há mudança relevante
    let delta = 0
    if (!wasImplantado && willImplantado) delta = 1
    else if (wasImplantado && !willImplantado) delta = -1

    if (delta !== 0 && updated?.criado_por) {
      // Valor da proposta (preferir payload.valor se fornecido, senão valor persistido)
      const baseValor = Number.isFinite(Number(valor))
        ? Number(valor)
        : Number(updated?.valor ?? currentProposal?.valor ?? 0)

      const p_valor = Number((delta * baseValor).toFixed(2))

      if (p_valor !== 0) {
        // delta aplicado na meta do usuário (debug silencioso)
        await supabase.rpc('atualizar_meta_usuario', {
          p_usuario_id: updated.criado_por,
          p_valor,
        })
      }
    }
  } catch (err) {
    try { console.error('[METAS] update error', sanitizeForLog({ message: err?.message })) } catch {}
    // não bloqueia a resposta ao cliente
  }

  // Notificação por e-mail (mesma lógica do PUT)
  try {
    const { data: analyst, error: userErr } = await supabase
      .from('usuarios')
      .select('email, nome')
      .eq('id', updated.criado_por)
      .single()
    // Monta informações comuns ao e-mail
    const humanStatus = String(status).charAt(0).toUpperCase() + String(status).slice(1)
    const empresaCNPJ = updated.cnpj ? formatCNPJ(updated.cnpj) : undefined
    let empresaLabel = updated.cnpj ? `CNPJ ${empresaCNPJ || updated.cnpj}` : 'Não informado'
  const apiBase = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const appUrl = process.env.CRM_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://admbelz.vercel.app/'

    if (updated.cnpj) {
      try {
        const resp = await fetch(`${apiBase}/api/validate-cnpj`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cnpj: updated.cnpj })
        })
        if (resp.ok) {
          const data = await resp.json()
          const rs = data?.data?.razao_social
          if (data?.valid && rs) {
            empresaLabel = `${rs} (CNPJ ${empresaCNPJ || updated.cnpj})`
          }
        }
      } catch (_) {}
    }

  const valorFmt = formatCurrency(updated.valor || 0)
  const operadora = updated.operadora || 'Não informado'
  const codigo = updated.codigo || currentProposal?.codigo || '—'

    // Envia para o analista (criado_por)
    if (!userErr && analyst?.email) {
      const humanStatus = String(status).charAt(0).toUpperCase() + String(status).slice(1)
      const subject = `[CRM Belz] Proposta ${codigo} atualizada: ${humanStatus}`
      const linkCRM = appUrl
      const text = `Olá ${analyst.nome || ''},\n\nA proposta ${codigo} teve alteração no status.\n\nCódigo: ${codigo}\nEmpresa: ${empresaLabel}\nOperadora: ${operadora}\nValor: ${valorFmt}\nStatus atual: ${humanStatus}\n\nAcesse o CRM: ${linkCRM}\n\n— CRM Belz`
      const html = renderBrandedEmail({
        title: 'Atualização de status da proposta',
        ctaText: 'Abrir CRM',
        ctaUrl: linkCRM,
        preheader: `Proposta ${codigo} atualizada`,
        contentHtml: `
          <p>Olá ${analyst.nome || ''},</p>
          <p>Uma proposta teve alteração no status. Confira os detalhes:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
            <tr><td style="padding:6px 0;"><strong>Código:</strong> ${codigo}</td></tr>
            <tr><td style="padding:6px 0;"><strong>CNPJ:</strong> ${updated.cnpj ? formatCNPJ(updated.cnpj) : 'Não informado'}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Razão Social:</strong> ${empresaLabel?.replace(/\s*\(CNPJ.*\)$/i, '') || 'Não informado'}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Status atual:</strong> ${humanStatus}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Operadora:</strong> ${operadora}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Valor:</strong> ${valorFmt}</td></tr>
          </table>
        `,
      })
      await sendEmail({ to: analyst.email, subject, text, html })
    }

    // Envia para o consultor (e-mail externo informado na proposta)
    if (updated?.consultor_email) {
      const subject2 = `[CRM Belz] Proposta ${codigo} atualizada: ${humanStatus}`
      const text2 = `Olá ${updated.consultor || ''},\n\nA proposta ${codigo} teve alteração no status.\n\nCódigo: ${codigo}\nEmpresa: ${empresaLabel}\nOperadora: ${operadora}\nValor: ${valorFmt}\nStatus atual: ${humanStatus}\n\n— CRM Belz`
      const html2 = renderBrandedEmail({
        title: 'Atualização de status da proposta',
        ctaText: 'Abrir CRM',
        ctaUrl: appUrl,
        preheader: `Proposta ${codigo} atualizada`,
        contentHtml: `
          <p>Olá ${updated.consultor || ''},</p>
          <p>Uma proposta teve alteração no status. Confira os detalhes:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
            <tr><td style="padding:6px 0;"><strong>Código:</strong> ${codigo}</td></tr>
            <tr><td style="padding:6px 0;"><strong>CNPJ:</strong> ${updated.cnpj ? formatCNPJ(updated.cnpj) : 'Não informado'}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Razão Social:</strong> ${empresaLabel?.replace(/\s*\(CNPJ.*\)$/i, '') || 'Não informado'}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Status atual:</strong> ${humanStatus}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Operadora:</strong> ${operadora}</td></tr>
            <tr><td style="padding:6px 0;"><strong>Valor:</strong> ${valorFmt}</td></tr>
          </table>
        `,
      })
      await sendEmail({ to: updated.consultor_email, subject: subject2, text: text2, html: html2 })
    }
  } catch (err) {
    try { console.error('[PROPOSALS] Email notify error', sanitizeForLog({ message: err?.message })) } catch {}
  }

  return handleCORS(NextResponse.json(updated), origin)
}
