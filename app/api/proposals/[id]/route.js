import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { supabase, handleCORS, requireAuth, ensureGestor } from '@/lib/api-helpers'
import { sendEmail } from '@/lib/email'
import { sanitizeForLog, checkRateLimit } from '@/lib/security'
import { renderBrandedEmail } from '@/lib/email-template'
import { formatCurrency, formatCNPJ } from '@/lib/utils'
import { STATUS_OPTIONS, OPERADORAS } from '@/lib/constants'
import { z } from 'zod'

// Validações endurecidas
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
const validateFutureOrToday = (d) => {
  if (!isoDateRegex.test(d)) return false
  const dt = new Date(d + 'T00:00:00Z')
  if (isNaN(dt.getTime())) return false
  const today = new Date()
  const todayUTC = new Date(today.toISOString().slice(0,10) + 'T00:00:00Z')
  return dt >= todayUTC
}

// Analista: pode alterar status (opcional) ou realizar claim (claim:true) para assumir
const analistaPatchSchema = z.object({
  status: z.enum([...STATUS_OPTIONS]).optional(),
  claim: z.boolean().optional(),
}).refine((data) => typeof data.status !== 'undefined' || data.claim === true, {
  message: 'Nada para atualizar',
  path: ['status']
})

// Gestor: campos ampliados (criado_por REMOVIDO - imutável)
const gestorPatchSchema = z.object({
  status: z.enum([...STATUS_OPTIONS]).optional(),
  quantidade_vidas: z.coerce.number().int().min(0).optional(),
  valor: z.coerce.number().min(0).optional(),
  previsao_implantacao: z.string().regex(isoDateRegex).refine(validateFutureOrToday, 'Data não pode ser passada').optional(),
  operadora: z.enum([...OPERADORAS]).optional(),
  consultor: z.string().min(1).optional(),
  consultor_email: z.string().email().optional(),
  observacoes_cliente: z.string().max(5000).optional(),
}).strict()

export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return handleCORS(new NextResponse(null, { status: 200 }), origin)
}

// GET detalhes de uma proposta específica (retorna também nomes de analista e atendente)
export async function GET(request, { params }) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }
  const { id } = params
  const { data: proposal, error } = await supabase
    .from('propostas')
  .select('id, codigo, cnpj, operadora, consultor, consultor_email, criado_por, atendido_por, atendido_em, quantidade_vidas, valor, status, previsao_implantacao, cliente_nome, cliente_email, criado_em, observacoes_cliente')
    .eq('id', id)
    .single()
  if (error || !proposal) {
    return handleCORS(NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 }), origin)
  }
  const user = auth.user
  const isGestor = user.tipo_usuario === 'gestor'
  let allowed = true
  if (!isGestor) {
    if (user.tipo_usuario === 'consultor') {
      allowed = (String(proposal.criado_por) === String(user.id)) || (proposal.consultor_email && proposal.consultor_email.toLowerCase() === String(user.email || '').toLowerCase())
    } else if (user.tipo_usuario === 'analista') {
      allowed = (String(proposal.criado_por) === String(user.id)) || (String(proposal.atendido_por) === String(user.id)) || !proposal.atendido_por
    }
  }
  if (!allowed) {
    return handleCORS(NextResponse.json({ error: 'Acesso negado' }, { status: 403 }), origin)
  }
  const ids = [proposal.criado_por, proposal.atendido_por].filter(Boolean)
  let userDataMap = {}
  if (ids.length > 0) {
    const { data: usuarios } = await supabase.from('usuarios').select('id, nome, tipo_usuario').in('id', ids)
    if (usuarios) userDataMap = Object.fromEntries(usuarios.map(u => [u.id, { nome: u.nome, tipo: u.tipo_usuario }]))
  }
  const criadoUser = userDataMap[proposal.criado_por]
  const atendenteUser = userDataMap[proposal.atendido_por]
  const analista_nome = criadoUser?.nome && criadoUser?.tipo === 'analista'
    ? criadoUser.nome
    : (String(proposal.criado_por) === String(user.id) && user.tipo_usuario === 'analista' ? user.nome : undefined)
  const atendido_por_nome = proposal.atendido_por
    ? (atendenteUser?.nome || (String(proposal.atendido_por) === String(user.id) ? user.nome : undefined))
    : null
  const analista_responsavel_nome = atendido_por_nome || analista_nome || null
  const response = {
    ...proposal,
    analista_nome,
    atendido_por_nome,
    analista_responsavel_nome,
  }
  return handleCORS(NextResponse.json(response), origin)
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

  // Rate limit por usuário (defesa contra abuso)
  const rlKey = `patch:proposta:${auth.user.id}`
  const rlOk = checkRateLimit(rlKey)
  if (!rlOk) {
    return handleCORS(NextResponse.json({ error: 'Muitas requisições, tente novamente mais tarde' }, { status: 429 }), origin)
  }

  // Bloqueia tentativa de mutação de criado_por (mesmo para gestor)
  if (Object.prototype.hasOwnProperty.call(body, 'criado_por')) {
    return handleCORS(NextResponse.json({ error: 'Campo não permitidos: criado_por' }, { status: 400 }), origin)
  }
  const isGestor = auth.user.tipo_usuario === 'gestor'
  // Claim é tratado antes para evitar necessidade de validar status
  if (body?.claim && auth.user.tipo_usuario === 'analista') {
    // Busca proposta para verificar assignment
    const { data: currentProposalPre, error: fetchErrorPre } = await supabase
      .from('propostas')
      .select('id, atendido_por, atendido_em')
      .eq('id', id)
      .single()
    if (fetchErrorPre || !currentProposalPre) {
      return handleCORS(NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 }), origin)
    }
    if (currentProposalPre.atendido_por) {
      return handleCORS(NextResponse.json({ error: 'Proposta já atribuída' }, { status: 400 }), origin)
    }
    const { data: claimed, error: claimErr } = await supabase
      .from('propostas')
      .update({ atendido_por: auth.user.id, atendido_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (claimErr) {
      return handleCORS(NextResponse.json({ error: claimErr.message }, { status: 500 }), origin)
    }
    // Auditoria claim
    try {
      await supabase.from('propostas_auditoria').insert({
        proposta_id: claimed.id,
        alterado_por: auth.user.id,
        changes: { claim: { before: null, after: { atendido_por: auth.user.id, atendido_em: claimed.atendido_em } } }
      })
    } catch (_) {}
    return handleCORS(NextResponse.json(claimed), origin)
  }

  const parsed = (isGestor ? gestorPatchSchema : analistaPatchSchema).safeParse(body)
  if (!parsed.success) {
    const payloadErr = process.env.NODE_ENV === 'production'
      ? { error: 'Dados inválidos' }
      : { error: 'Dados inválidos', issues: parsed.error.issues }
    return handleCORS(NextResponse.json(payloadErr, { status: 400 }), origin)
  }

  const updates = { ...parsed.data }
  // Normaliza email de consultor se fornecido
  if (updates.consultor_email) updates.consultor_email = String(updates.consultor_email).trim().toLowerCase()

  // Busca a proposta e checa autorização:
  // - Gestor pode alterar qualquer
  // - Analista pode alterar apenas se for o criador
  // - Consultor NÃO pode alterar
  const { data: currentProposal, error: fetchError } = await supabase
    .from('propostas')
  .select('id, codigo, criado_por, valor, status, cnpj, operadora, consultor, consultor_email, quantidade_vidas, previsao_implantacao, atendido_por, atendido_em, observacoes_cliente')
    .eq('id', id)
    .single()
  if (fetchError || !currentProposal) {
    try { console.warn('[PROPOSALS] PATCH not found', { id, fetchError: fetchError?.message }) } catch {}
    return handleCORS(NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 }), origin)
  }
  // Claim já tratado no bloco anterior

  if (auth.user.tipo_usuario === 'consultor') {
    try { console.warn('[PROPOSALS] PATCH forbidden for consultor', { id, by: auth.user.id }) } catch {}
    return handleCORS(NextResponse.json({ error: 'Sem permissão para alterar esta proposta' }, { status: 403 }), origin)
  }
  if (auth.user.tipo_usuario !== 'gestor' && currentProposal.criado_por !== auth.user.id) {
    try { console.warn('[PROPOSALS] PATCH forbidden', { id, by: auth.user.id }) } catch {}
    return handleCORS(NextResponse.json({ error: 'Sem permissão para alterar esta proposta' }, { status: 403 }), origin)
  }

  // Constrói update controlado
  const updatePayload = {}
  if (typeof updates.status !== 'undefined') updatePayload.status = updates.status
  if (isGestor) {
    if (typeof updates.quantidade_vidas !== 'undefined') updatePayload.quantidade_vidas = updates.quantidade_vidas
    if (typeof updates.valor !== 'undefined') updatePayload.valor = updates.valor
    if (typeof updates.previsao_implantacao !== 'undefined') updatePayload.previsao_implantacao = updates.previsao_implantacao
    if (typeof updates.operadora !== 'undefined') updatePayload.operadora = updates.operadora
    if (typeof updates.consultor !== 'undefined') updatePayload.consultor = updates.consultor
    if (typeof updates.consultor_email !== 'undefined') updatePayload.consultor_email = updates.consultor_email
  if (typeof updates.observacoes_cliente !== 'undefined') updatePayload.observacoes_cliente = updates.observacoes_cliente
  }

  let updateQuery = supabase
    .from('propostas')
    .update(updatePayload)
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
    const willImplantado = String((typeof updates.status !== 'undefined' ? updates.status : currentProposal.status)) === 'implantado'

    // Só aplica delta quando há mudança relevante
    let delta = 0
    if (!wasImplantado && willImplantado) delta = 1
    else if (wasImplantado && !willImplantado) delta = -1

    if (delta !== 0 && updated?.criado_por) {
      // Valor da proposta (preferir payload.valor se fornecido, senão valor persistido)
      const baseValor = Number.isFinite(Number(updates?.valor))
        ? Number(updates?.valor)
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

  // Auditoria: registra alterações (somente campos realmente alterados)
  try {
    const changed = {}
  const keys = ['status','quantidade_vidas','valor','previsao_implantacao','operadora','consultor','consultor_email']
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(updatePayload, k)) {
        const before = currentProposal[k]
        const after = updated[k]
        // compara valores convertendo para string para evitar NaN traps
        if (String(before ?? '') !== String(after ?? '')) {
          changed[k] = { before, after }
        }
      }
    }
    if (Object.keys(changed).length > 0) {
      await supabase.from('propostas_auditoria').insert({
        proposta_id: updated.id,
        alterado_por: auth.user.id,
        changes: changed,
      })
    }
  } catch (e) {
    try { console.warn('[AUDIT] failed to write audit log', sanitizeForLog({ message: e?.message })) } catch {}
  }

  // Notificação por e-mail (mesma lógica do PUT)
  try {
    const { data: analyst, error: userErr } = await supabase
      .from('usuarios')
      .select('email, nome')
      .eq('id', updated.criado_por)
      .single()
  // Monta informações comuns ao e-mail
  const humanStatus = String(updated.status || currentProposal.status || '').replace(/^./, c => c.toUpperCase())
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
  const subject = `[Sistema de Gestão - Belz] Proposta ${codigo} atualizada: ${humanStatus}`
      const linkCRM = appUrl
  const text = `Olá ${analyst.nome || ''},\n\nA proposta ${codigo} teve alteração no status.\n\nCódigo: ${codigo}\nEmpresa: ${empresaLabel}\nOperadora: ${operadora}\nValor: ${valorFmt}\nStatus atual: ${humanStatus}\n\nAcesse o Sistema de Gestão: ${linkCRM}\n\n— Sistema de Gestão - Belz`
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
  const subject2 = `[Sistema de Gestão - Belz] Proposta ${codigo} atualizada: ${humanStatus}`
  const text2 = `Olá ${updated.consultor || ''},\n\nA proposta ${codigo} teve alteração no status.\n\nCódigo: ${codigo}\nEmpresa: ${empresaLabel}\nOperadora: ${operadora}\nValor: ${valorFmt}\nStatus atual: ${humanStatus}\n\n— Sistema de Gestão - Belz`
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
