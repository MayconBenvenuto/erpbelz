import nodemailer from 'nodemailer'
import { sanitizeInput, sanitizeForLog } from './security'

let transporter
let verifiedOnce = false

function getTransporter() {
  if (transporter) return transporter
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true'

  const tlsOptions = {}
  if (process.env.SMTP_TLS_SERVERNAME) {
    tlsOptions.servername = process.env.SMTP_TLS_SERVERNAME
  }
  if (String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true').toLowerCase() === 'false') {
    tlsOptions.rejectUnauthorized = false
  }

  const debug = String(process.env.SMTP_DEBUG || 'false').toLowerCase() === 'true'
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    tls: Object.keys(tlsOptions).length ? tlsOptions : undefined,
    logger: debug,
    debug,
  })
  return transporter
}

export async function sendEmail({ to, subject, text, html }) {
  try {
  const fromEmail = process.env.EMAIL_FROM || 'comunicacao@belzseguros.com.br'
  const fromName = process.env.EMAIL_FROM_NAME || 'CRM Belz'
  const from = `${fromName} <${fromEmail}>`
    const replyTo = process.env.EMAIL_REPLY_TO
    const overrideTo = process.env.EMAIL_OVERRIDE_TO
    const mail = {
      from,
      to: sanitizeInput(overrideTo || to),
      subject: sanitizeInput(subject).slice(0, 200),
      text: typeof text === 'string' ? text.slice(0, 5000) : undefined,
      html: typeof html === 'string' ? html : undefined,
      replyTo: replyTo ? sanitizeInput(replyTo) : undefined,
    }
    const tx = getTransporter()
    if (!verifiedOnce && (process.env.SMTP_DEBUG || '').toLowerCase() === 'true') {
      try {
        await tx.verify()
        verifiedOnce = true
      } catch (e) {
        console.error('SMTP verify failed:', sanitizeForLog({ message: e?.message }))
      }
    }
    const info = await tx.sendMail(mail)
    return { ok: true, id: info.messageId }
  } catch (error) {
    console.error('Erro ao enviar e-mail:', sanitizeForLog({ message: error.message }))
    return { ok: false, error: 'Falha ao enviar e-mail' }
  }
}
