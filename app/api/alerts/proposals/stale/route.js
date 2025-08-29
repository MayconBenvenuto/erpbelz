import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { supabase, handleCORS, requireAuth } from '@/lib/api-helpers'
import { sendEmail } from '@/lib/email'
import { renderBrandedEmail } from '@/lib/email-template'
import { formatCNPJ, formatCurrency } from '@/lib/utils'

// E-mail principal do gestor (configurável). Usar variável para fácil alteração.
const PRIMARY_GESTOR_EMAIL = process.env.PRIMARY_GESTOR_EMAIL || 'mayconbenvenuto@belzseguros.com.br'

// Parâmetro de alerta (idade mínima em horas). Default 24h.
const ALERT_HOURS = parseInt(process.env.STALE_PROPOSAL_ALERT_HOURS || '24')

// Proteção: pode ser chamado por
// 1) Cron com header X-Cron-Key == process.env.CRON_SECRET
// 2) Usuário autenticado gestor
async function authorize(request) {
  const cronKey = request.headers.get('x-cron-key')
  if (cronKey && process.env.CRON_SECRET && cronKey === process.env.CRON_SECRET) {
    return { mode: 'cron' }
  }
  const auth = await requireAuth(request)
  if (auth.error) return { error: auth.error, status: auth.status }
  if (auth.user.tipo_usuario !== 'gestor') {
    return { error: 'Apenas gestor ou cron autorizado', status: 403 }
  }
  return { mode: 'user', user: auth.user }
}

function buildEmailTable(rows) {
  if (!rows.length) return '<p>Nenhuma proposta elegível no momento.</p>'
  const header = `
    <tr>
      <th style="text-align:left;padding:6px;border-bottom:1px solid #eee;font-size:12px;">Código</th>
      <th style="text-align:left;padding:6px;border-bottom:1px solid #eee;font-size:12px;">CNPJ</th>
      <th style="text-align:left;padding:6px;border-bottom:1px solid #eee;font-size:12px;">Consultor</th>
      <th style="text-align:left;padding:6px;border-bottom:1px solid #eee;font-size:12px;">Valor</th>
      <th style="text-align:left;padding:6px;border-bottom:1px solid #eee;font-size:12px;">Horas</th>
      <th style="text-align:left;padding:6px;border-bottom:1px solid #eee;font-size:12px;">Status</th>
    </tr>`
  const body = rows.map(r => `
    <tr>
      <td style="padding:6px;border-bottom:1px solid #f5f5f5;">${r.codigo || r.id}</td>
      <td style="padding:6px;border-bottom:1px solid #f5f5f5;">${formatCNPJ(r.cnpj)}</td>
      <td style="padding:6px;border-bottom:1px solid #f5f5f5;">${r.consultor || '-'}</td>
      <td style="padding:6px;border-bottom:1px solid #f5f5f5;">${formatCurrency(r.valor || 0)}</td>
      <td style="padding:6px;border-bottom:1px solid #f5f5f5;">${r.horas_analise}</td>
      <td style="padding:6px;border-bottom:1px solid #f5f5f5;">${r.status}</td>
    </tr>`).join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;border-collapse:collapse;">${header}${body}</table>`
}

export async function GET(request) {
  const origin = request.headers.get('origin')
  const authz = await authorize(request)
  if (authz.error) {
    return handleCORS(NextResponse.json({ error: authz.error }, { status: authz.status }), origin)
  }

  // Critério: propostas com status 'em análise' criadas há >= ALERT_HOURS (sem limite superior)
  const now = Date.now()
  const threshold = new Date(now - ALERT_HOURS * 60 * 60 * 1000).toISOString()

  const { data: proposals, error } = await supabase
    .from('propostas')
    .select('*')
    .eq('status', 'em análise')
    .lte('criado_em', threshold) // criado_em anterior ou igual ao limite => já passou 24h
    .order('criado_em', { ascending: true })

  if (error) {
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
  }

  const enriched = (proposals || []).map(p => ({
    ...p,
    horas_analise: Math.floor((now - new Date(p.criado_em).getTime()) / (1000 * 60 * 60)),
  }))

  // Buscar gestores
  const { data: gestores, error: gErr } = await supabase
    .from('usuarios')
    .select('email,nome')
    .eq('tipo_usuario', 'gestor')

  if (gErr) {
    return handleCORS(NextResponse.json({ error: gErr.message }, { status: 500 }), origin)
  }

  const destinatariosSet = new Set([(gestores || []).map(g => g.email).filter(Boolean)].flat())
  // garante inclusão do gestor primário
  if (PRIMARY_GESTOR_EMAIL) destinatariosSet.add(PRIMARY_GESTOR_EMAIL)
  const destinatarios = Array.from(destinatariosSet)

  let emailResult = null
  if (enriched.length && destinatarios.length) {
  const subject = `[Sistema de Gestão - Belz] Alerta propostas ${ALERT_HOURS}h+: ${enriched.length}`
    const tableHtml = buildEmailTable(enriched)
    const contentHtml = `
      <p>Foram identificadas <strong>${enriched.length}</strong> proposta(s) em análise com pelo menos ${ALERT_HOURS} horas desde a criação.</p>
      ${tableHtml}
      <p style="margin-top:16px;font-size:12px;color:#666;">Este e-mail é gerado automaticamente. Caso alguma proposta já tenha sido tratada, ignore.</p>
    `
    const html = renderBrandedEmail({
      title: 'Propostas pendentes de análise',
      ctaText: 'Abrir CRM',
      ctaUrl: process.env.CRM_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://admbelz.vercel.app/',
      contentHtml,
  preheader: `Alerta de ${enriched.length} proposta(s) com ${ALERT_HOURS}+ horas` ,
    })
    // Envia individual para cada gestor (melhor visibilidade de falhas)
    const sendResults = []
    for (const email of destinatarios) {
      try {
        const r = await sendEmail({ to: email, subject, html })
        sendResults.push({ email, ok: r?.ok })
      } catch (e) {
        sendResults.push({ email, ok: false, error: e?.message })
      }
    }
    emailResult = sendResults
  }

  return handleCORS(NextResponse.json({
    mode: authz.mode,
    proposals_found: enriched.length,
    alerted: Boolean(emailResult),
    recipients: (emailResult || []).length,
  emails: emailResult,
  threshold_hours: ALERT_HOURS,
  }), origin)
}
