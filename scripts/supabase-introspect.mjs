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
import fs from 'fs'
import path from 'path'

function getEnv(key) {
  return process.env[key] && String(process.env[key]).trim()
}

// =========================
// CLI ARG PARSING / MODOS
// =========================
// Suporte a flags:
//   --prod        -> Usa variáveis PROD_SUPABASE_URL / PROD_SUPABASE_SERVICE_ROLE_KEY
//   --url=...     -> Força URL
//   --key=...     -> Força chave (service role ou anon)
//   --no-doc      -> Não atualizar DOC_SUPABASE.md
//   --out=arquivo -> Caminho alternativo da doc
//   --help        -> Ajuda

const args = process.argv.slice(2)
const argMap = {}
for (const a of args) {
  if (a.startsWith('--')) {
    const [k, v] = a.replace(/^--/, '').split('=')
    argMap[k] = v === undefined ? true : v
  }
}

if (argMap.help) {
  console.log(`Uso: node scripts/supabase-introspect.mjs [--prod] [--url=URL] [--key=KEY] [--no-doc] [--out=DOC_SUPABASE.md]\n\nFlags:\n  --prod       Usa PROD_SUPABASE_URL / PROD_SUPABASE_SERVICE_ROLE_KEY\n  --url=       URL Supabase manual\n  --key=       Chave (service role ou anon) manual\n  --no-doc     Apenas imprime, não altera documentação\n  --out=       Caminho do arquivo de documentação (default DOC_SUPABASE.md)\n  --help       Mostra esta ajuda`) 
  process.exit(0)
}

const isProd = !!argMap.prod
// Variáveis padrão (dev/staging)
let url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
let serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
let anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if (isProd) {
  // Variáveis dedicadas de produção (não expor chaves reais em repositório)
  url = argMap.url || getEnv('PROD_SUPABASE_URL') || url
  serviceKey = argMap.key || getEnv('PROD_SUPABASE_SERVICE_ROLE_KEY') || serviceKey
  anonKey = getEnv('PROD_SUPABASE_ANON_KEY') || anonKey
} else {
  url = argMap.url || url
  if (argMap.key) serviceKey = argMap.key
}

if (!url || (!serviceKey && !anonKey)) {
  console.error('Erro: faltam variáveis para conectar. Verifique: ' + (isProd ? 'PROD_SUPABASE_URL + PROD_SUPABASE_SERVICE_ROLE_KEY' : 'NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'))
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

async function checkRpcs(existingRoutineNames = []) {
  const target = ['atualizar_meta', 'atualizar_meta_usuario']
  const results = {}
  for (const fn of target) {
    if (existingRoutineNames.includes(fn)) {
      results[fn] = 'exists'
    } else {
      results[fn] = 'missing'
    }
  }
  return results
}

// =========================
// DOC UPDATE
// =========================
function formatDocSection(summary) {
  const ts = new Date().toISOString()
  let out = ''
  out += `<!-- AUTO_DB_SCHEMA:START -->\n` +
         `<!-- Gerado por supabase-introspect.mjs em ${ts} (modo: ${isProd ? 'PRODUCAO' : 'PADRAO'}) -->\n`
  out += `\n## Esquema (Introspecção ${isProd ? 'Produção' : 'Padrão'})\n\n`
  for (const t of summary.tables) {
    out += `### ${t.table} (linhas: ${t.count ?? '?'} )\n\n`
    if (t.columns?.length) {
      out += `| Coluna | Tipo | Not Null | Default |\n|--------|------|----------|---------|\n`
      for (const c of t.columns) {
        out += `| ${c.name} | ${c.type} | ${c.nullable === 'NO' ? 'sim' : 'não'} | ${c.default ?? ''} |\n`
      }
      out += '\n'
    }
    if (t.sample?.length) {
      out += '**Amostra de dados (até 3):**\\n\n'
      for (const row of t.sample) {
        out += '`' + JSON.stringify(row) + '`\\n\n'
      }
    }
  }
  out += `\n### Funções RPC\n\n`
  Object.entries(summary.rpcs).forEach(([fn, status]) => { out += `- ${fn}: ${status}\n` })
  out += `\n> Nota: Se algum campo ou tabela esperado não aparecer, verifique policies RLS e permissões do service role usado.\n`
  out += `\n<!-- AUTO_DB_SCHEMA:END -->\n`
  return out
}

function updateDocumentation(summary) {
  const docPath = path.resolve(argMap.out || 'DOC_SUPABASE.md')
  let existing = ''
  try { existing = fs.readFileSync(docPath, 'utf8') } catch { /* ignore */ }
  const newSection = formatDocSection(summary)
  const startMarker = '<!-- AUTO_DB_SCHEMA:START -->'
  const endMarker = '<!-- AUTO_DB_SCHEMA:END -->'
  if (existing.includes(startMarker) && existing.includes(endMarker)) {
    const updated = existing.replace(new RegExp(startMarker + '[\s\S]*?' + endMarker), newSection)
    fs.writeFileSync(docPath, updated, 'utf8')
    console.log(`Documento atualizado (substituída seção existente): ${docPath}`)
  } else if (existing) {
    const appended = existing.trimEnd() + '\n\n' + newSection
    fs.writeFileSync(docPath, appended, 'utf8')
    console.log(`Documento atualizado (seção anexada): ${docPath}`)
  } else {
    fs.writeFileSync(docPath, '# Supabase – Estrutura\n\n' + newSection, 'utf8')
    console.log(`Documento criado: ${docPath}`)
  }
}

async function main() {
  console.log('== Introspecção Supabase ==')
  console.log(`URL: ${url}`)
  console.log(`Auth: ${serviceKey ? 'service_role' : 'anon'}`)
  console.log(`Modo: ${isProd ? 'PRODUCAO' : 'PADRAO'}`)
  // Descoberta dinâmica de tabelas no schema public
    let tables = []
    // Primeiro tenta RPC list_public_tables()
    try {
      const { data: tblRpc, error: tblErr } = await supabase.rpc('list_public_tables')
      if (tblErr) throw tblErr
      tables = (tblRpc || []).map(r => r.table_name || r)
    } catch (e) {
      console.warn('Aviso: falha RPC list_public_tables():', e.message || e)
      // Fallback antigo (pode falhar novamente se policies bloquearem)
      try {
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name, table_type')
          .eq('table_schema', 'public')
          .order('table_name')
        if (error) throw error
        tables = (data || [])
          .filter(t => t.table_type === 'BASE TABLE')
          .map(t => t.table_name)
          .filter(name => !name.startsWith('pg_') && !name.startsWith('_'))
      } catch (e2) {
        console.warn('Aviso: fallback information_schema.tables também falhou:', e2.message || e2)
      }
    }
  if (!tables.length) {
    // Fallback conhecido
    tables = ['usuarios', 'propostas', 'sessoes', 'metas']
    console.log('Usando lista fallback de tabelas:', tables.join(', '))
  } else {
    console.log('Tabelas descobertas:', tables.join(', '))
  }
  const infos = []
  for (const t of tables) {
    const info = await getTableInfo(t)
    infos.push(info)
  }

  // Rotinas (para checar existência das funcoes de metas)
  let routineNames = []
  try {
    const { data: routines, error: rErr } = await supabase.rpc('list_public_routines')
    if (!rErr && routines) routineNames = routines.map(r => r.routine_name)
  } catch (e) {
    console.warn('Aviso: não foi possível listar rotinas:', e.message || e)
  }

  const rpcs = await checkRpcs(routineNames)

  // Carregar colunas via RPC se disponível para adicionar tipos reais ao summary
  try {
    const { data: colsRpc, error: colsErr } = await supabase.rpc('list_public_table_columns')
    if (!colsErr && colsRpc) {
      // Mapear por tabela
      const byTable = colsRpc.reduce((acc, c) => {
        (acc[c.table_name] = acc[c.table_name] || []).push(c)
        return acc
      }, {})
      for (const t of infos) {
        if (byTable[t.table]) {
          t.columns = byTable[t.table].map(c => ({
            column_name: c.column_name,
            data_type: c.data_type,
            is_nullable: c.is_nullable,
            column_default: c.column_default || null,
          }))
          // Limpa erro antigo de columns (evita ruído se fallback falhou)
          if (t.errors) t.errors.columns = undefined
        }
      }
    } else if (colsErr) {
      console.warn('Aviso: RPC list_public_table_columns falhou:', colsErr.message)
    }
  } catch (e) {
    console.warn('Aviso: exceção ao obter colunas por RPC:', e.message || e)
  }

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

  // Views (best-effort)
  try {
    const { data: views, error: vErr } = await supabase.rpc('list_public_views')
    if (!vErr && views?.length) {
      summary.views = views.map(v => v.view_name || v)
    }
  } catch (e) {
    console.warn('Aviso: não foi possível listar views:', e.message || e)
  }

  // Saída detalhada console
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

  console.log('\n== Resumo Estrutural ==')
  for (const t of summary.tables) {
    console.log(`* ${t.table}: ${t.count ?? '?'} linhas, campos: ${t.columns.map(c => c.name).join(', ')}`)
  }
  if (summary.views?.length) {
    console.log(`Views: ${summary.views.join(', ')}`)
  }

  if (!argMap['no-doc']) {
    updateDocumentation(summary)
  } else {
    console.log('Flag --no-doc ativa: não atualizando documentação.')
  }
}

main().catch((e) => {
  console.error('Falha na introspecção:', e)
  process.exit(1)
})
