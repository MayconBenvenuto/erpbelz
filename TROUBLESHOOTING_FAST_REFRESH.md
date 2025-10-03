# Guia de Solução: Fast Refresh Error

## 🎯 Sintomas

```
⚠ Fast Refresh had to perform a full reload due to a runtime error.
```

Este erro ocorre quando o Next.js não consegue aplicar Hot Module Replacement (HMR) e precisa recarregar a página inteira.

---

## 🔧 Soluções Rápidas

### 1. Limpar Cache (Solução Imediata)

```powershell
# Windows PowerShell
Remove-Item -Recurse -Force .next
yarn dev
```

```bash
# Linux/Mac
rm -rf .next
yarn dev
```

### 2. Usar Script de Diagnóstico

```bash
yarn debug:fast-refresh
```

Este script analisa todos os componentes React e identifica:

- ✅ Exportações mistas problemáticas
- ✅ Hooks condicionais
- ✅ Side effects fora de useEffect
- ✅ Componentes sem retorno

---

## 🐛 Causas Comuns e Correções

### ❌ Problema 1: Exportação Mista

**Errado:**

```jsx
export const MyComponent = () => { ... }
export default MyComponent
```

**Correto:**

```jsx
// Opção A: Default export
export default function MyComponent() { ... }

// Opção B: Named export
export function MyComponent() { ... }
```

### ❌ Problema 2: Side Effects no Corpo

**Errado:**

```jsx
function MyComponent() {
  localStorage.setItem('key', 'value') // ❌ Side effect direto
  const data = fetch('/api/data') // ❌ Fetch síncrono
  return <div>...</div>
}
```

**Correto:**

```jsx
function MyComponent() {
  useEffect(() => {
    localStorage.setItem('key', 'value') // ✅ Dentro de useEffect
  }, [])

  const { data } = useQuery(['data'], () => fetch('/api/data')) // ✅ React Query
  return <div>...</div>
}
```

### ❌ Problema 3: Hooks Condicionais

**Errado:**

```jsx
function MyComponent({ isEnabled }) {
  if (isEnabled) {
    const [value, setValue] = useState(0) // ❌ Hook condicional
  }
  return <div>...</div>
}
```

**Correto:**

```jsx
function MyComponent({ isEnabled }) {
  const [value, setValue] = useState(0) // ✅ Hook sempre declarado

  if (!isEnabled) return null
  return <div>{value}</div>
}
```

### ❌ Problema 4: Componente sem Retorno

**Errado:**

```jsx
function MyComponent() {
  ;<div>Content</div> // ❌ Faltou o return
}
```

**Correto:**

```jsx
function MyComponent() {
  return <div>Content</div> // ✅ Com return
}
```

### ❌ Problema 5: Importações Circulares

**Errado:**

```jsx
// ComponentA.jsx
import ComponentB from './ComponentB'

// ComponentB.jsx
import ComponentA from './ComponentA' // ❌ Circular
```

**Correto:**

```jsx
// Extrair lógica compartilhada para um terceiro arquivo
// shared.js
export const sharedLogic = () => { ... }

// ComponentA.jsx
import { sharedLogic } from './shared'

// ComponentB.jsx
import { sharedLogic } from './shared'
```

---

## 🎯 Boas Práticas Específicas do Projeto

### Estrutura de Componentes

Siga o padrão dos componentes existentes:

```jsx
// ✅ Padrão do projeto
'use client' // Se necessário

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'

export default function MyComponent({ prop1, prop2 }) {
  const { user } = useAuth()
  const [state, setState] = useState(null)

  useEffect(() => {
    // Side effects aqui
  }, [])

  return <div>{/* JSX aqui */}</div>
}
```

### Lazy Loading

Use o padrão de `lazy-sections.jsx` para componentes pesados:

```jsx
import { lazy, Suspense } from 'react'
import { SectionLoader } from '@/components/lazy-sections'

const HeavyComponent = lazy(() => import('./HeavyComponent'))

export function MyWrapper(props) {
  return (
    <Suspense fallback={<SectionLoader message="Carregando..." />}>
      <HeavyComponent {...props} />
    </Suspense>
  )
}
```

### Validações e Sanitização

Use helpers de `lib/api-helpers.js`:

```jsx
import { sanitizeInput, validateEmail, validateCNPJ } from '@/lib/api-helpers'

function FormComponent() {
  const handleSubmit = (data) => {
    const cleanData = {
      nome: sanitizeInput(data.nome),
      email: validateEmail(data.email),
      cnpj: validateCNPJ(data.cnpj),
    }
    // ...
  }
}
```

---

## 🔍 Debugging Avançado

### Ver Logs Detalhados

```bash
# Modo verbose
NEXT_DEBUG=1 yarn dev
```

### Verificar Webpack Bundle

```bash
# Analisar o bundle
yarn build
```

### Monitorar Memory Leaks

Abra DevTools → Performance → Memory e grave enquanto navega. Procure por:

- Detached DOM nodes
- Event listeners não removidos
- Timers (setInterval/setTimeout) não limpos

---

## 📋 Checklist Antes de Commitar

- [ ] `yarn lint` passa sem erros
- [ ] `yarn debug:fast-refresh` não encontra problemas
- [ ] Componente usa `useEffect` para side effects
- [ ] Hooks estão no topo da função, sem condições
- [ ] Exportação é consistente (default OU named)
- [ ] Componente sempre retorna JSX ou null
- [ ] Sem importações circulares
- [ ] Usa helpers de validação quando necessário

---

## 🆘 Se Nada Funcionar

1. **Reiniciar completamente:**

   ```powershell
   Remove-Item -Recurse -Force .next, node_modules
   yarn install --frozen-lockfile
   yarn dev
   ```

2. **Verificar versões:**

   ```bash
   node --version  # Deve ser >= 20
   yarn --version  # Deve ser >= 1.22
   ```

3. **Desabilitar temporariamente Fast Refresh:**

   Em `next.config.js`:

   ```js
   module.exports = {
     // ... outras configs
     experimental: {
       reactRefresh: false, // Desabilita Fast Refresh
     },
   }
   ```

4. **Abrir issue com detalhes:**
   - Output completo do terminal
   - Resultado de `yarn debug:fast-refresh`
   - Últimas alterações feitas no código
   - Versões de Node/Yarn/Next

---

## 📚 Recursos

- [Next.js Fast Refresh Docs](https://nextjs.org/docs/architecture/fast-refresh)
- [React Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [Next.js Troubleshooting](https://nextjs.org/docs/messages)

---

**Última atualização:** 3 de outubro de 2025  
**Versão Next.js:** 14.2
