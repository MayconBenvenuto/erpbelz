// Teste de envio de e-mail via lib/email.js
// Uso: defina as variáveis no .env.local (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, etc.)
// e execute com: node tests/test_email_send.js "destinatario@dominio.com"

import 'dotenv/config'
import { sendEmail } from '../lib/email.js'

function getArgRecipient() {
  const arg = process.argv[2]
  return arg && /@/.test(arg) ? arg : null
}

async function main() {
  const to = getArgRecipient() || process.env.EMAIL_OVERRIDE_TO || process.env.DEFAULT_TEST_EMAIL
  if (!to) {
    console.error('Destinatário não informado. Passe como argumento ou defina EMAIL_OVERRIDE_TO/DEFAULT_TEST_EMAIL.')
    process.exit(2)
  }

  // Ativa debug se solicitado
  if (String(process.env.SMTP_DEBUG || 'false').toLowerCase() === 'true') {
    console.log('[DEBUG] SMTP_DEBUG=true, será chamado transporter.verify() antes do envio.')
  }

  console.log('Enviando e-mail de teste para:', to)
  const res = await sendEmail({
    to,
    subject: 'Teste de e-mail - CRM Belz',
    text: 'Este é um e-mail de teste do CRM Belz.',
    html: '<p>Este é um <strong>e-mail de teste</strong> do CRM Belz.</p>'
  })

  if (res.ok) {
    console.log('✅ Enviado com sucesso. messageId =', res.id)
    process.exit(0)
  } else {
    console.error('❌ Falha ao enviar e-mail:', res.error)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('❌ Erro inesperado:', e?.message || e)
  process.exit(1)
})
