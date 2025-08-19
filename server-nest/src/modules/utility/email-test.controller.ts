import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt.guard'
import { GestorGuard } from '../auth/gestor.guard'
import nodemailer from 'nodemailer'

@Controller('email-test')
@UseGuards(JwtAuthGuard, GestorGuard)
export class EmailTestController {
  constructor(@Inject('SUPABASE') private _supabase: any) {}

  @Post()
  async test(@Body() body: any) {
    const to = body?.to || process.env.EMAIL_OVERRIDE_TO
    const ok = await this.sendEmail({
      to,
      subject: 'Teste de e-mail - CRM Belz',
      text: 'Este é um e-mail de teste do CRM Belz.',
      html: '<p>Este é um <strong>e-mail de teste</strong> do CRM Belz.</p>'
    })
    if (!ok.ok) return { ok: false, error: ok.error }
    return { ok: true, messageId: ok.id, to }
  }

  private async sendEmail({ to, subject, text, html }: { to?: string, subject: string, text?: string, html?: string }) {
    try {
      const host = process.env.SMTP_HOST
      const port = Number(process.env.SMTP_PORT || 587)
      const user = process.env.SMTP_USER
      const pass = process.env.SMTP_PASS
      const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true'
      const transporter = nodemailer.createTransport({ host, port, secure, auth: user && pass ? { user, pass } : undefined })
      const fromEmail = process.env.EMAIL_FROM || 'comunicacao@belzseguros.com.br'
      const fromName = process.env.EMAIL_FROM_NAME || 'CRM Belz'
      const from = `${fromName} <${fromEmail}>`
      const info = await transporter.sendMail({ from, to, subject, text, html })
      return { ok: true, id: info.messageId }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Falha ao enviar e-mail' }
    }
  }
}
