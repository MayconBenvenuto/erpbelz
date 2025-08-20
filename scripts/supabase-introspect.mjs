#!/usr/bin/env node
/* eslint-disable no-console */
/*
  Supabase Introspection Script
  - Conecta com Supabase usando NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY em último caso)
  - Lista tabelas relevantes (usuarios, propostas, sessoes, metas)
  - Mostra colunas (nome, tipo, default, constraints básicas quando acessíveis)
  - Conta registros por tabela
  - Faz amostras de dados (até 3 linhas por tabela, com campos principais)
  - Verifica existência de funções RPC chaves: atualizar_meta, atualizar_meta_usuario
  - Emite um resumo final da estrutura para documentação rápida

  Uso:
    yarn supabase:introspect

  Requisitos:
    - Defina no .env da raiz: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (preferível) ou NEXT_PUBLIC_SUPABASE_ANON_KEY
*/
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

function getEnv(key) {
  return process.env[key] && String(process.env[key]).trim()
}

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if (!url || (!serviceKey && !anonKey)) {
  console.error('Erro: configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) no .env')
  process.exit(1)
}

const supabase = createClient(url, serviceKey || anonKey)

async function getTableInfo(table) {
  try {
    // Tenta via information_schema (pode não estar exposto no PostgREST)
    let columns = null
    let errCols = null
    try {
      const r = await supabase
        .from('information_schema.columns')
        .select('table_name, column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', table)
        .order('ordinal_position')
      columns = r.data
      errCols = r.error
    } catch (e) {
      errCols = { message: String(e) }
    }

    const { count, error: errCount } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    const { data: sample, error: errSample } = await supabase
      .from(table)
      .select('*')
      .limit(3)

    // Fallback de colunas pelas chaves do sample
    let columnsFromSample = []
    if (!columns && sample && sample.length) {
      const keys = Array.from(new Set(sample.flatMap((row) => Object.keys(row))))
      columnsFromSample = keys.map((k) => ({ column_name: k, data_type: 'unknown', is_nullable: 'UNKNOWN', column_default: null }))
    }

    return {
      table,
      columns: columns || columnsFromSample || [],
      count: typeof count === 'number' ? count : null,
      errors: { columns: errCols?.message, count: errCount?.message, sample: errSample?.message },
      sample: sample || [],
    }
  } catch (e) {
    return { table, error: String(e) }
  }
}

async function checkRpcs() {
  const rpcs = ['atualizar_meta', 'atualizar_meta_usuario']
  const results = {}
  for (const fn of rpcs) {
    try {
      const { error } = await supabase.rpc(fn, {})
      results[fn] = error ? `existe? possivelmente sim, mas erro ao invocar sem args: ${error.message}` : 'ok'
    } catch (e) {
      results[fn] = `erro: ${String(e)}`
    }
  }
  return results
}

async function main() {
  console.log('== Introspecção Supabase ==')
  console.log(`URL: ${url}`)
  console.log(`Auth: ${serviceKey ? 'service_role' : 'anon'}`)

  const tables = ['usuarios', 'propostas', 'sessoes', 'metas']
  const infos = []
  for (const t of tables) {
    const info = await getTableInfo(t)
    infos.push(info)
  }

  const rpcs = await checkRpcs()

  const summary = {
    tables: infos.map(i => ({
      table: i.table,
      count: i.count,
      columns: i.columns?.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable, default: c.column_default })) || [],
      sample: i.sample,
      errors: i.errors,
    })),
    rpcs,
  }

  // Saída detalhada
  for (const t of summary.tables) {
    console.log(`\n--- Tabela: ${t.table} (linhas: ${t.count ?? 'desconhecido'}) ---`)
    if (t.columns?.length) {
      console.log('Colunas:')
      for (const c of t.columns) {
        console.log(` - ${c.name} :: ${c.type}${c.nullable === 'NO' ? ' NOT NULL' : ''}${c.default ? ` DEFAULT ${c.default}` : ''}`)
      }
    }
    if (t.sample?.length) {
      console.log('Amostra (até 3 linhas):')
      for (const row of t.sample) {
        console.log('  ', JSON.stringify(row))
      }
    }
    if (t.errors && Object.values(t.errors).some(Boolean)) {
      console.log('Erros de acesso (ignorar se policies bloquearem):', t.errors)
    }
  }

  console.log('\nFunções RPC:')
  Object.entries(summary.rpcs).forEach(([fn, status]) => console.log(` - ${fn}: ${status}`))

  // Resumo conciso
  console.log('\n== Resumo Estrutural ==')
  for (const t of summary.tables) {
    console.log(`* ${t.table}: ${t.count ?? '?'} linhas, campos: ${t.columns.map(c => c.name).join(', ')}`)
  }
}

main().catch((e) => {
  console.error('Falha na introspecção:', e)
  process.exit(1)
})
