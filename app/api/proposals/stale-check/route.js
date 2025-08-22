import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth, ensureGestor } from '@/lib/api-helpers'
import { sendEmail } from '@/lib/email'
import { formatCurrency, formatCNPJ } from '@/lib/utils'
import { renderBrandedEmail } from '@/lib/email-template'

export async function POST(request) {
  const origin = request.headers.get('origin')
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }
  const guard = ensureGestor(auth.user)
  if (guard) return handleCORS(NextResponse.json(guard, { status: guard.status }), origin)

  const now = Date.now()
  const ago48 = new Date(now - 48 * 60 * 60 * 1000).toISOString()
  const ago72 = new Date(now - 72 * 60 * 60 * 1000).toISOString()

  // Janela de 24h: entre 72h e 48h atrás para evitar notificações duplicadas
  const { data: proposals, error } = await supabase
    .from('propostas')
    .select('*')
    .eq('status', 'em análise')
    .gte('criado_em', ago72)
    .lte('criado_em', ago48)
    .order('criado_em', { ascending: true })

  if (error) {
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  }

  if (!proposals || proposals.length === 0) {
    return handleCORS(NextResponse.json({ ok: true, notified: 0 }), origin)
  }

  // Determina destinatários (env override ou todos gestores)
  let recipients = []
  if (process.env.GESTOR_NOTIFY_EMAIL) {
    recipients = [process.env.GESTOR_NOTIFY_EMAIL]
  } else {
    const { data: gestores } = await supabase
      .from('usuarios')
      .select('email')
      .eq('tipo_usuario', 'gestor')
    recipients = (gestores || []).map(g => g.email).filter(Boolean)
  }

  if (recipients.length === 0) {
    return handleCORS(NextResponse.json({ ok: false, error: 'Sem destinatários gestores' }, { status: 400 }), origin)
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const appUrl = process.env.CRM_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://admbelz.vercel.app/'

  async function enrichEmpresaLabel(p) {
    const cnpjFmt = p.cnpj ? formatCNPJ(p.cnpj) : undefined
    let label = p.cnpj ? `CNPJ ${cnpjFmt || p.cnpj}` : 'Não informado'
    if (!p.cnpj) return label
    try {
      const resp = await fetch(`${baseUrl}/api/validate-cnpj`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: p.cnpj })
      })
      if (resp.ok) {
        const data = await resp.json()
        const rs = data?.data?.razao_social
        if (data?.valid && rs) label = `${rs} (CNPJ ${cnpjFmt || p.cnpj})`
      }
    } catch {}
    return label
  }

  const items = await Promise.all(proposals.map(async (p) => {
    const empresa = await enrichEmpresaLabel(p)
    return {
      codigo: p.codigo || p.id,
      empresa,
      operadora: p.operadora || 'Não informado',
      valor: formatCurrency(p.valor || 0),
      criado_em: p.criado_em,
    }
  }))

  const subject = `[Sistema de Gestão - Belz] Propostas sem ação há 48h (${items.length})`
  const listText = items.map((i) => (
    `- Proposta ${i.codigo}\n  Empresa: ${i.empresa}\n  Operadora: ${i.operadora}\n  Valor: ${i.valor}\n  Criada em: ${new Date(i.criado_em).toLocaleString('pt-BR')}`
  )).join('\n\n')

  const text = `Olá,\n\nAs seguintes propostas estão há 48h sem alteração de status (em análise):\n\n${listText}\n\nAcesse o Sistema de Gestão para direcionar as ações: ${appUrl}\n\n— Sistema de Gestão - Belz`
  const listHtml = items.map((i) => (
    `<li><p><strong>Proposta:</strong> ${i.codigo}<br/><strong>Empresa:</strong> ${i.empresa}<br/><strong>Operadora:</strong> ${i.operadora}<br/><strong>Valor:</strong> ${i.valor}<br/><strong>Criada em:</strong> ${new Date(i.criado_em).toLocaleString('pt-BR')}</p></li>`
  )).join('')
  const html = renderBrandedEmail({
    title: 'Propostas sem ação há 48h',
    ctaText: 'Abrir CRM',
  ctaUrl: appUrl,
    contentHtml: `
      <p>Olá,</p>
      <p>As seguintes propostas estão há <strong>48h sem alteração</strong> de status (<em>em análise</em>):</p>
      <ul>${listHtml}</ul>
    `,
  })

  const to = recipients.join(',')
  const res = await sendEmail({ to, subject, text, html })
  if (!res.ok) {
    return handleCORS(NextResponse.json({ ok: false, error: res.error }), origin)
  }

  return handleCORS(NextResponse.json({ ok: true, notified: items.length, recipients }), origin)
}
