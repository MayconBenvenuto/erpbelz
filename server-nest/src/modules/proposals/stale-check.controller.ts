import { Controller, Post, UseGuards } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { GestorGuard } from '../auth/gestor.guard'
import { EmailService } from '../../common/email.service'
import { renderBrandedEmail } from '../../common/email-template'
import { formatCurrency, formatCNPJ } from '../../common/utils'

@Controller('proposals/stale-check')
@UseGuards(JwtAuthGuard, GestorGuard)
export class StaleCheckController {
  constructor(@Inject('SUPABASE') private supabase: any) {}

  @Post()
  async check() {
    const now = Date.now()
    const ago48 = new Date(now - 48 * 60 * 60 * 1000).toISOString()
    const ago72 = new Date(now - 72 * 60 * 60 * 1000).toISOString()

    const { data: proposals, error } = await this.supabase
      .from('propostas')
      .select('*')
      .eq('status', 'em análise')
      .gte('criado_em', ago72)
      .lte('criado_em', ago48)
      .order('criado_em', { ascending: true })
    if (error) throw new Error(error.message)

    const items = (proposals || []).map((p: any) => ({
      id: p.id,
      empresa: p.cnpj ? `CNPJ ${formatCNPJ(p.cnpj) || p.cnpj}` : 'Não informado',
      operadora: p.operadora || 'Não informado',
      valor: formatCurrency(p.valor || 0),
      criado_em: p.criado_em,
    }))

    if (!items.length) return { ok: true, notified: 0 }

    let recipients: string[] = []
    if (process.env.GESTOR_NOTIFY_EMAIL) {
      recipients = [process.env.GESTOR_NOTIFY_EMAIL]
    } else {
      const { data: gestores } = await this.supabase
        .from('usuarios')
        .select('email')
        .eq('tipo_usuario', 'gestor')
      recipients = (gestores || []).map((g: any) => g.email).filter(Boolean)
    }

    if (!recipients.length) return { ok: false, error: 'Sem destinatários gestores' }

    const appUrl = process.env.CRM_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const subject = `[CRM Belz] Propostas sem ação há 48h (${items.length})`
  const listHtml = items.map((i: any) => (
      `<li><p><strong>Proposta:</strong> ${i.id}<br/><strong>Empresa:</strong> ${i.empresa}<br/><strong>Operadora:</strong> ${i.operadora}<br/><strong>Valor:</strong> ${i.valor}<br/><strong>Criada em:</strong> ${new Date(i.criado_em).toLocaleString('pt-BR')}</p></li>`
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
    const text = `Olá,\n\nPropostas sem ação há 48h: ${items.length}. Acesse: ${appUrl}`

    const mail = new EmailService()
    await mail.send({ to: recipients.join(','), subject, text, html })
    return { ok: true, notified: items.length, recipients }
  }
}
