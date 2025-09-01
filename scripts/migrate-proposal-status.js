// Script para executar migração de status das propostas
// Usage: node scripts/migrate-proposal-status.js

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carrega as variáveis de ambiente
const dotenv = await import('dotenv')
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🔄 Executando migração de status das propostas...')
    
    // Lê o arquivo de migração
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250901_update_proposal_status_constraint.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Remove BEGIN/COMMIT pois vamos executar comando por comando
    const commands = migrationSQL
      .replace(/BEGIN;|COMMIT;/g, '')
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'))
    
    console.log(`📝 Executando ${commands.length} comandos...`)
    
    for (const [index, command] of commands.entries()) {
      if (command.trim()) {
        console.log(`⏳ Comando ${index + 1}/${commands.length}...`)
        const { error } = await supabase.rpc('exec_sql', { sql: command })
        
        if (error) {
          // Se o erro for que a constraint já não existe, podemos ignorar
          if (error.message?.includes('constraint') && error.message?.includes('does not exist')) {
            console.log(`⚠️  Constraint já removida: ${error.message}`)
            continue
          }
          throw error
        }
      }
    }
    
    console.log('✅ Migração executada com sucesso!')
    console.log('📋 Status atualizados:')
    console.log('  • "em análise" → "recepcionado"')
    console.log('  • "implantando" → "análise"')
    console.log('  • "pendencias seguradora" → "pendência"')
    console.log('  • "pendente cliente" → "pendência"')
    console.log('  • "negado" → "proposta declinada"')
    
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error)
    process.exit(1)
  }
}

// Função para executar SQL diretamente (fallback se rpc não funcionar)
async function runMigrationDirect() {
  try {
    console.log('🔄 Executando migração diretamente...')
    
    // 1. Remove constraint existente
    console.log('⏳ Removendo constraint antiga...')
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE propostas DROP CONSTRAINT IF EXISTS propostas_status_check' 
    })
    
    // 2. Atualiza dados existentes
    console.log('⏳ Atualizando dados existentes...')
    const updates = [
      "UPDATE propostas SET status = 'recepcionado' WHERE status = 'em análise'",
      "UPDATE propostas SET status = 'análise' WHERE status = 'implantando'", 
      "UPDATE propostas SET status = 'pendência' WHERE status = 'pendencias seguradora'",
      "UPDATE propostas SET status = 'pendência' WHERE status = 'pendente cliente'",
      "UPDATE propostas SET status = 'proposta declinada' WHERE status = 'negado'"
    ]
    
    for (const update of updates) {
      const { error } = await supabase.rpc('exec_sql', { sql: update })
      if (error) console.log(`⚠️ ${error.message}`)
    }
    
    // 3. Adiciona nova constraint
    console.log('⏳ Adicionando nova constraint...')
    const newConstraint = `
      ALTER TABLE propostas 
      ADD CONSTRAINT propostas_status_check 
      CHECK (status IN (
        'recepcionado',
        'análise', 
        'pendência',
        'pleito seguradora',
        'boleto liberado',
        'implantado',
        'proposta declinada'
      ))
    `
    
    const { error: constraintError } = await supabase.rpc('exec_sql', { sql: newConstraint })
    if (constraintError) throw constraintError
    
    console.log('✅ Migração executada com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro na migração direta:', error)
    process.exit(1)
  }
}

// Executa migração
if (process.argv.includes('--direct')) {
  runMigrationDirect()
} else {
  runMigration()
}
