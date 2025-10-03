#!/usr/bin/env node
/**
 * Script de diagnóstico para erros de Fast Refresh
 * Uso: node scripts/debug-fast-refresh.mjs
 */

import { readdir, readFile, stat } from 'fs/promises'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

const issues = []

async function checkFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8')
    const relativePath = filePath.replace(rootDir, '.')
    const lines = content.split('\n')

    // Verifica exportação mista problemática
    const hasDefaultExport = /export\s+default\s+/.test(content)
    const hasNamedExport = /export\s+(const|function|class)\s+/.test(content)
    const hasComponentDeclaration = /^(const|function)\s+\w+\s*=/.test(content)
    
    if (hasDefaultExport && hasNamedExport && hasComponentDeclaration) {
      issues.push({
        file: relativePath,
        type: 'EXPORTAÇÃO_MISTA',
        message: 'Possui export default e named exports de componentes',
        severity: 'warning'
      })
    }

    // Verifica hooks condicionais
    // Ignora se estiver dentro de useCallback, useMemo, useEffect
    lines.forEach((line, idx) => {
      if (/^\s*(if|while|for|switch)\s*\(/.test(line)) {
        const contextBefore = lines.slice(Math.max(0, idx - 10), idx).join('\n')
        const nextLines = lines.slice(idx, idx + 5).join('\n')
        
        // Ignora se dentro de callback/memo/effect
        const isInsideCallback = /use(Callback|Memo|Effect)\s*\(/.test(contextBefore)
        const hasHooks = /use(State|Effect|Callback|Memo|Ref|Context|Query|Mutation)\s*\(/.test(nextLines)
        
        if (hasHooks && !isInsideCallback) {
          issues.push({
            file: relativePath,
            type: 'HOOK_CONDICIONAL',
            message: `Possível hook condicional na linha ${idx + 1}`,
            severity: 'error',
            line: idx + 1
          })
        }
      }
    })

    // Verifica side effects no corpo do componente
    const componentMatches = content.matchAll(/^export\s+(?:default\s+)?function\s+(\w+)/gm)
    for (const match of componentMatches) {
      const componentName = match[1]
      const startIdx = match.index
      
      // Procura por side effects comuns
      const componentBody = content.slice(startIdx, startIdx + 500)
      const sideEffects = [
        /localStorage\.(set|get|remove)/,
        /sessionStorage\.(set|get|remove)/,
        /document\.(querySelector|getElementById)/,
        /window\.location/,
      ]

      sideEffects.forEach(pattern => {
        if (pattern.test(componentBody) && !/useEffect/.test(componentBody.slice(0, 200))) {
          issues.push({
            file: relativePath,
            type: 'SIDE_EFFECT',
            message: `Possível side effect em ${componentName} sem useEffect`,
            severity: 'warning'
          })
        }
      })
    }

    // Verifica componentes sem retorno
    // Detecta tanto function declarations quanto arrow functions
    const funcMatches = [
      ...content.matchAll(/function\s+(\w+)\s*\([^)]*\)\s*\{/g),
      ...content.matchAll(/const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g)
    ]
    
    for (const match of funcMatches) {
      const funcName = match[1]
      if (/^[A-Z]/.test(funcName)) { // Componente (inicia com maiúscula)
        const startIdx = match.index
        const snippet = content.slice(startIdx, startIdx + 200)
        
        // Verifica se tem return ou arrow function inline
        const hasReturn = snippet.includes('return')
        const hasArrowReturn = /=>\s*</.test(snippet) || /=>\s*\(/.test(snippet)
        
        if (!hasReturn && !hasArrowReturn) {
          issues.push({
            file: relativePath,
            type: 'SEM_RETORNO',
            message: `Componente ${funcName} pode estar sem return`,
            severity: 'warning' // Reduzido para warning (muitos falsos positivos)
          })
        }
      }
    }

  } catch (err) {
    console.error(`Erro ao processar ${filePath}:`, err.message)
  }
}

async function scanDirectory(dir, extensions = ['.js', '.jsx', '.tsx']) {
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    // Ignora node_modules, .next, backups, etc
    if (entry.name.startsWith('.') || 
        entry.name === 'node_modules' || 
        entry.name.startsWith('components_backup_')) {
      continue
    }

    if (entry.isDirectory()) {
      await scanDirectory(fullPath, extensions)
    } else if (extensions.includes(extname(entry.name))) {
      await checkFile(fullPath)
    }
  }
}

console.log('🔍 Verificando componentes React por problemas de Fast Refresh...\n')

const startTime = Date.now()

await scanDirectory(join(rootDir, 'components'))
await scanDirectory(join(rootDir, 'app'))

const duration = Date.now() - startTime

console.log(`\n✅ Verificação completa em ${duration}ms\n`)

if (issues.length === 0) {
  console.log('✨ Nenhum problema detectado!')
} else {
  console.log(`⚠️  Encontrados ${issues.length} possíveis problemas:\n`)
  
  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')

  if (errors.length > 0) {
    console.log('🔴 ERROS:')
    errors.forEach(issue => {
      console.log(`  ${issue.file}`)
      console.log(`    ${issue.type}: ${issue.message}`)
      if (issue.line) console.log(`    Linha: ${issue.line}`)
      console.log()
    })
  }

  if (warnings.length > 0) {
    console.log('🟡 AVISOS:')
    warnings.forEach(issue => {
      console.log(`  ${issue.file}`)
      console.log(`    ${issue.type}: ${issue.message}`)
      console.log()
    })
  }
}

console.log('\n📝 Dicas:')
console.log('  • Exportações mistas: Use apenas export default OU named export por arquivo')
console.log('  • Hooks condicionais: Sempre declare hooks no topo, sem condições')
console.log('  • Side effects: Envolva em useEffect() com dependências corretas')
console.log('  • Sem retorno: Todo componente React deve retornar JSX ou null')
console.log('\n  Para mais info: https://nextjs.org/docs/messages/fast-refresh\n')
