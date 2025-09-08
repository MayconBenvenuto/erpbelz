import { NextResponse } from 'next/server'
import { supabase, handleCORS, requireAuth, ensureGestor } from '@/lib/api-helpers'
import { sendEmail } from '@/lib/email'
import { renderBrandedEmail } from '@/lib/email-template'
import { formatCNPJ } from '@/lib/utils'

export const runtime = 'nodejs'

export async function POST(request) {
  const origin = request.headers.get('origin')
  // Autorização: apenas gestor autenticado (sem cron)
  const auth = await requireAuth(request)
  if (auth.error) {
    return handleCORS(NextResponse.json({ error: auth.error }, { status: auth.status }), origin)
  }
  const guard = ensureGestor(auth.user)
  if (guard) return handleCORS(NextResponse.json(guard, { status: guard.status }), origin)

  try {
    const todayISO = new Date().toISOString().slice(0, 10)
    // Seleciona solicitações em atraso e ainda não notificadas (via flag no histórico)
    const { data: items, error } = await supabase
      .from('solicitacoes')
      .select('*')
      .not('sla_previsto', 'is', null)
      .lt('sla_previsto', todayISO)
      .neq('status', 'concluída')
      .neq('status', 'cancelada')

    if (error) {
      return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }), origin)
    }

    const list = (items || []).filter(it => {
      const h = Array.isArray(it.historico) ? it.historico : []
      return !h.some(ev => ev && String(ev.status || '').toLowerCase() === 'sla_atrasado_notificado')
    })

    if (list.length === 0) {
      return handleCORS(NextResponse.json({ ok: true, notified: 0 }), origin)
    }

    // Utilitário para coletar destinatários participantes
    async function getParticipantEmails(ticket) {
      const ids = new Set()
      if (ticket.criado_por) ids.add(ticket.criado_por)
      if (ticket.atendido_por) ids.add(ticket.atendido_por)
      const hist = Array.isArray(ticket.historico) ? ticket.historico : []
      hist.forEach(ev => { if (ev && ev.usuario_id) ids.add(ev.usuario_id) })
      if (ids.size === 0) return []
      const { data: users } = await supabase.from('usuarios').select('id,email').in('id', Array.from(ids))
      return (users || []).map(u => u.email).filter(Boolean)
    }

  const appUrl = process.env.ERP_APP_URL || process.env.CRM_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://admbelz.vercel.app/'
    let notified = 0

  for (const t of list) {
      try {
        const recipients = await getParticipantEmails(t)
        if (!recipients || recipients.length === 0) continue

        const subject = `[Sistema de Gestão - Belz] Movimentação ${t.codigo || t.id} em atraso`
        const html = renderBrandedEmail({
          title: 'Movimentação em atraso',
      ctaText: 'Abrir ERP',
          ctaUrl: appUrl,
          contentHtml: `
            <p>Olá,</p>
            <p>A movimentação <strong>${t.codigo || t.id}</strong> está com o <strong>SLA vencido</strong> e requer atenção.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
              <tr><td style="padding:6px 0;"><strong>Empresa:</strong> ${t.razao_social ? t.razao_social : (t.cnpj ? 'CNPJ ' + (formatCNPJ(t.cnpj) || t.cnpj) : 'Não informado')}</td></tr>
              <tr><td style="padding:6px 0;"><strong>Tipo:</strong> ${t.tipo || '—'}${t.subtipo ? ' / ' + t.subtipo : ''}</td></tr>
              <tr><td style="padding:6px 0;"><strong>Status atual:</strong> ${t.status || '—'}</td></tr>
              <tr><td style="padding:6px 0;"><strong>SLA previsto:</strong> ${t.sla_previsto || '—'}</td></tr>
            </table>
            <p>Por favor, avaliem e tomem as ações necessárias.</p>
          `,
        })
        const to = recipients.join(',')
        const res = await sendEmail({ to, subject, html })
        if (res?.ok) {
          notified++
          // Marcar no histórico para evitar nova notificação
          const historico = Array.isArray(t.historico) ? t.historico : []
          const updatedHist = [...historico, { status: 'sla_atrasado_notificado', em: new Date().toISOString(), usuario_id: null }]
          await supabase.from('solicitacoes').update({ historico: updatedHist }).eq('id', t.id)
        }
      } catch (_) {
        // segue para próximo
      }
    }

    return handleCORS(NextResponse.json({ ok: true, notified }), origin)
  } catch (e) {
    return handleCORS(NextResponse.json({ error: 'Erro ao processar' }, { status: 500 }), origin)
  }
}
