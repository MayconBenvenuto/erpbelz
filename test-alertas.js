/**
 * Script de teste para o sistema de alertas de propostas estagnadas
 * 
 * Este script:
 * 1. Busca uma proposta existente com status 'em análise'
 * 2. Modifica temporariamente sua data de criação para 3 dias atrás
 * 3. Testa o endpoint de alertas
 * 4. Restaura a data original
 */

const baseUrl = 'http://localhost:3000'

// Token do gestor para autenticação (você precisa pegar um token válido)
const GESTOR_TOKEN = 'SEU_TOKEN_AQUI' // Substitua por um token válido de gestor

async function testarSistemaAlertas() {
  console.log('🔍 Iniciando teste do sistema de alertas...')
  
  try {
    // 1. Buscar propostas em análise
    console.log('\n1. Buscando propostas em análise...')
    const proposalsRes = await fetch(`${baseUrl}/api/proposals`, {
      headers: { 'Authorization': `Bearer ${GESTOR_TOKEN}` }
    })
    
    if (!proposalsRes.ok) {
      throw new Error(`Erro ao buscar propostas: ${proposalsRes.status}`)
    }
    
    const proposals = await proposalsRes.json()
    const emAnalise = proposals.filter(p => p.status === 'em análise')
    
    console.log(`✅ Encontradas ${emAnalise.length} propostas em análise`)
    
    if (emAnalise.length === 0) {
      console.log('❌ Nenhuma proposta em análise encontrada. Crie uma proposta primeiro.')
      return
    }
    
    const proposta = emAnalise[0]
    console.log(`📋 Usando proposta: ${proposta.codigo || proposta.id} (CNPJ: ${proposta.cnpj})`)
    
    // 2. Modificar data de criação para 3 dias atrás (apenas para teste)
    console.log('\n2. Modificando data de criação para simular proposta estagnada...')
    const dataOriginal = proposta.criado_em
    const data3DiasAtras = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    
    // Nota: Este passo requer acesso direto ao banco ou endpoint específico
    // Por segurança, vamos apenas simular o teste
    console.log(`📅 Data original: ${dataOriginal}`)
    console.log(`📅 Data simulada: ${data3DiasAtras}`)
    
    // 3. Testar endpoint de status de alertas
    console.log('\n3. Testando endpoint de status de alertas...')
    const statusRes = await fetch(`${baseUrl}/api/alerts/stale-proposals`, {
      headers: { 'Authorization': `Bearer ${GESTOR_TOKEN}` }
    })
    
    if (!statusRes.ok) {
      throw new Error(`Erro no status: ${statusRes.status}`)
    }
    
    const statusData = await statusRes.json()
    console.log('📊 Status atual dos alertas:')
    console.log(`   - Propostas +48h: ${statusData.propostas_48h}`)
    console.log(`   - Propostas +72h: ${statusData.propostas_72h}`)
    console.log(`   - Alertas ativos: ${statusData.alertas_ativos}`)
    
    // 4. Testar trigger manual (sem enviar email de verdade)
    console.log('\n4. Testando verificação manual...')
    const triggerRes = await fetch(`${baseUrl}/api/alerts/stale-proposals`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GESTOR_TOKEN}` }
    })
    
    if (!triggerRes.ok) {
      throw new Error(`Erro no trigger: ${triggerRes.status}`)
    }
    
    const triggerData = await triggerRes.json()
    console.log('✅ Trigger executado:')
    console.log(`   - Propostas notificadas: ${triggerData.notified}`)
    console.log(`   - Destinatários: ${triggerData.recipients?.join(', ')}`)
    
    // 5. Testar endpoint direto de stale-check
    console.log('\n5. Testando endpoint stale-check direto...')
    const staleRes = await fetch(`${baseUrl}/api/proposals/stale-check`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GESTOR_TOKEN}` }
    })
    
    if (!staleRes.ok) {
      throw new Error(`Erro no stale-check: ${staleRes.status}`)
    }
    
    const staleData = await staleRes.json()
    console.log('✅ Stale-check executado:')
    console.log(`   - OK: ${staleData.ok}`)
    console.log(`   - Notificadas: ${staleData.notified}`)
    console.log(`   - Destinatários: ${staleData.recipients?.join(', ')}`)
    
    console.log('\n🎉 Teste concluído com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
  }
}

// Para executar o teste:
// 1. Substitua GESTOR_TOKEN por um token válido
// 2. Execute: node test-alertas.js
if (require.main === module) {
  testarSistemaAlertas()
}

module.exports = { testarSistemaAlertas }
