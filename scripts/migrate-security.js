#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Script de Migração de Segurança
 * 
 * Este script atualiza o sistema para as novas medidas de segurança:
 * - Converte senhas em texto plano para hash bcrypt
 * - Valida configuração de ambiente
 * - Gera chaves JWT se necessário
 */

const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')

// Configuração
const BCRYPT_ROUNDS = 12

async function migratePasswords() {
  console.log('🔐 Iniciando migração de segurança...\n')

  // Verificar variáveis de ambiente
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Variáveis do Supabase não configuradas!')
    console.log('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  // Gerar JWT secret se não existir
  if (!process.env.JWT_SECRET) {
    const jwtSecret = crypto.randomBytes(32).toString('hex')
    console.log('🔑 JWT_SECRET gerado:', jwtSecret)
    console.log('⚠️  Adicione esta linha ao seu arquivo .env:')
    console.log(`JWT_SECRET=${jwtSecret}\n`)
  }

  // Conectar ao Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  try {
    // Buscar usuários com senhas em texto plano
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('id, email, senha')
    
    if (error) {
      console.error('❌ Erro ao buscar usuários:', error.message)
      process.exit(1)
    }

    if (!users || users.length === 0) {
      console.log('ℹ️  Nenhum usuário encontrado.')
      return
    }

    console.log(`👥 Encontrados ${users.length} usuários`)

    let updated = 0
    let alreadyHashed = 0

    for (const user of users) {
      // Verificar se a senha já está hashada
      if (user.senha.startsWith('$2a$') || user.senha.startsWith('$2b$')) {
        alreadyHashed++
        console.log(`✅ ${user.email}: senha já está hashada`)
        continue
      }

      // Hash da senha em texto plano
      const hashedPassword = await bcrypt.hash(user.senha, BCRYPT_ROUNDS)
      
      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ senha: hashedPassword })
        .eq('id', user.id)

      if (updateError) {
        console.error(`❌ Erro ao atualizar ${user.email}:`, updateError.message)
        continue
      }

      updated++
      console.log(`🔐 ${user.email}: senha atualizada para hash`)
    }

    console.log('\n📊 Relatório da migração:')
    console.log(`   ✅ Senhas atualizadas: ${updated}`)
    console.log(`   ✅ Já hashadas: ${alreadyHashed}`)
    console.log(`   📦 Total processado: ${users.length}`)

    if (updated > 0) {
      console.log('\n🎉 Migração concluída com sucesso!')
      console.log('⚠️  IMPORTANTE: Todas as senhas agora usam hash bcrypt.')
      console.log('   Os usuários podem continuar usando as mesmas senhas.')
    }

  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message)
    process.exit(1)
  }
}

// Função para verificar dependências
function checkDependencies() {
  try {
    require('bcryptjs')
    require('@supabase/supabase-js')
    return true
  } catch (error) {
    console.error('❌ Dependências não instaladas!')
    console.log('Execute: npm install bcryptjs @supabase/supabase-js')
    return false
  }
}

// Executar migração
if (require.main === module) {
  if (!checkDependencies()) {
    process.exit(1)
  }
  
  migratePasswords().catch(console.error)
}

module.exports = { migratePasswords }
