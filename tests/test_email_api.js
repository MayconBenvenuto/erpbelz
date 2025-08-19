/* eslint-disable no-console */
// Teste de envio de e-mail via endpoint /api/email-test
// Pré-requisitos:
// - Servidor Next em execução (http://localhost:3000)
// - .env.local com SMTP_HOST/PORT/USER/PASS configurados
// - JWT_SECRET igual ao usado pela aplicação
// Uso:
//   node tests/test_email_api.js destinatario@belzseguros.com.br
// ou
//   yarn test:email

'use strict'

const jwt = require('jsonwebtoken')

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TO_ARG = process.argv[2]
const TO = TO_ARG || process.env.EMAIL_OVERRIDE_TO || process.env.DEFAULT_TEST_EMAIL || 'mayconbenvenuto@belzseguros.com.br'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
const TEST_USER = {
  userId: 1,
  email: process.env.TEST_USER_EMAIL || 'tester@belzseguros.com.br',
  tipo: 'gestor',
}

async function main() {
  // Gera token de gestor
  const token = jwt.sign(TEST_USER, JWT_SECRET, { expiresIn: '10m' })

  const url = `${BASE_URL}/api/email-test`
  console.log('➡️  POST', url)
  console.log('   Para:', TO)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ to: TO }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('❌ Falha HTTP', res.status, data)
    process.exit(1)
  }

  if (data && data.ok) {
    console.log('✅ Enviado com sucesso:', data)
    process.exit(0)
  }

  console.error('❌ Erro inesperado:', data)
  process.exit(1)
}

main().catch((e) => {
  console.error('❌ Exceção:', e?.message || e)
  process.exit(1)
})
