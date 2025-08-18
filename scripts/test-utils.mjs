import assert from 'node:assert'
import { formatCurrency, formatCNPJ, getStatusBadgeVariant } from '../lib/utils.js'

try {
  // formatCurrency
  const money = formatCurrency(1234.56)
  assert.ok(/R\$\s?1\.234,56/.test(money), `formatCurrency falhou: '${money}'`)

  // formatCNPJ
  const cnpj = formatCNPJ('11222333000181')
  assert.equal(cnpj, '11.222.333/0001-81', `formatCNPJ falhou: '${cnpj}'`)

  // getStatusBadgeVariant
  assert.equal(getStatusBadgeVariant('implantado'), 'default')
  assert.equal(getStatusBadgeVariant('negado'), 'destructive')
  assert.ok(['secondary','outline','default','destructive'].includes(getStatusBadgeVariant('desconhecido')))

  console.log('✅ utils: todos os testes passaram')
  process.exit(0)
} catch (err) {
  console.error('❌ utils: teste falhou')
  console.error(err.message || err)
  process.exit(1)
}
