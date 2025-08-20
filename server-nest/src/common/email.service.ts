import nodemailer from 'nodemailer'

export class EmailService {
  private transporter: nodemailer.Transporter | null = null

  private getTransporter() {
    if (this.transporter) return this.transporter
    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT || 587)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true'
    this.transporter = nodemailer.createTransport({ host, port, secure, auth: user && pass ? { user, pass } : undefined })
    return this.transporter
  }

  async send({ to, subject, text, html }: { to: string, subject: string, text?: string, html?: string }) {
    const tx = this.getTransporter()
    const fromEmail = process.env.EMAIL_FROM || 'comunicacao@belzseguros.com.br'
    const fromName = process.env.EMAIL_FROM_NAME || 'CRM Belz'
    const from = `${fromName} <${fromEmail}>`
    const info = await tx.sendMail({ from, to, subject, text, html })
    return info.messageId
  }
}
