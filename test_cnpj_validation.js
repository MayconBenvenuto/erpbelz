/* eslint-disable no-console */
// Teste da validação de CNPJ
const testCNPJs = [
  {
    cnpj: '00000000000191',
    description: 'Banco do Brasil (válido)',
    expected: 'valid'
  },
  {
    cnpj: '11222333000181',
    description: 'CNPJ escolar (válido)',
    expected: 'valid'
  },
  {
    cnpj: '27865757000102',
    description: 'Globo Comunicação (válido)',
    expected: 'valid'
  },
  {
    cnpj: '11111111111111',
    description: 'Sequência repetida (inválido)',
    expected: 'invalid'
  },
  {
    cnpj: '11222333000199',
    description: 'Dígitos verificadores incorretos (inválido)',
    expected: 'invalid'
  },
  {
    cnpj: '123456',
    description: 'Formato incorreto (inválido)',
    expected: 'invalid'
  }
]

async function testValidation() {
  console.log('🧪 Iniciando testes de validação de CNPJ...\n')
  
  for (const test of testCNPJs) {
    try {
      const response = await fetch('http://localhost:3000/api/validate-cnpj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: test.cnpj })
      })
      
      const result = await response.json()
      const status = result.valid ? 'valid' : 'invalid'
      const success = status === test.expected
      
      console.log(`${success ? '✅' : '❌'} ${test.description}`)
      console.log(`   CNPJ: ${test.cnpj}`)
      console.log(`   Resultado: ${status} (esperado: ${test.expected})`)
      
      if (result.valid && result.data) {
        console.log(`   Fonte: ${result.data.source || 'Não informado'}`)
        if (result.data.razao_social) {
          console.log(`   Empresa: ${result.data.razao_social}`)
        }
      } else if (result.error) {
        console.log(`   Erro: ${result.error}`)
      }
      
      console.log('')
      
    } catch (error) {
      console.log(`❌ ${test.description}`)
      console.log(`   Erro de conexão: ${error.message}\n`)
    }
  }
  
  console.log('🏁 Testes concluídos!')
}

// Executar se chamado diretamente
if (typeof window === 'undefined') {
  testValidation()
}

module.exports = { testCNPJs, testValidation }
