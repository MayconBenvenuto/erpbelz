/**
 * Template de Componente React - ERP Belz
 *
 * IMPORTANTE: Siga este padrão para evitar erros de Fast Refresh.
 *
 * Checklist:
 * ✅ Export default OU named export (não misturar)
 * ✅ Hooks no topo, nunca condicionais
 * ✅ Side effects dentro de useEffect
 * ✅ Sempre retornar JSX ou null
 * ✅ Usar helpers de validação (sanitizeInput, etc)
 */

'use client' // ← Adicione se o componente usar hooks ou eventos do navegador

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * @param {Object} props
 * @param {string} props.title - Título do componente
 * @param {Function} props.onAction - Callback de ação
 */
export default function MyComponent({ title, onAction }) {
  // 1. HOOKS - Sempre no topo, nunca condicionais
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 2. CALLBACKS - Memoize funções que serão passadas como props
  const handleClick = useCallback(() => {
    if (onAction) {
      onAction({ user, data })
    }
  }, [onAction, user, data])

  // 3. SIDE EFFECTS - Use useEffect para APIs, localStorage, etc
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/endpoint')
        const json = await response.json()
        setData(json)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // ← Dependências vazias = roda uma vez no mount

  // 4. CLEANUP - Limpe timers, listeners, etc
  useEffect(() => {
    const interval = setInterval(() => {
      // Faça algo periódico (ex: atualizar timestamp)
    }, 5000)

    // ✅ Cleanup quando componente desmontar
    return () => clearInterval(interval)
  }, [])

  // 5. EARLY RETURNS - Renderização condicional no topo
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Carregando...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-500">Erro: {error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null // ← Sempre retorne null em vez de undefined
  }

  // 6. RENDER PRINCIPAL - Sempre retorne JSX
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p>Usuário: {user?.nome}</p>
          <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
          <Button onClick={handleClick}>Executar Ação</Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ==========================================
// VARIAÇÕES DE EXPORTAÇÃO
// ==========================================

// Opção A: Default Export (usado acima)
// export default function MyComponent() { ... }

// Opção B: Named Export
// export function MyComponent() { ... }

// Opção C: Constante com arrow function
// const MyComponent = ({ title }) => { ... }
// export default MyComponent

// ❌ NÃO FAÇA: Misturar exports
// export const MyComponent = () => { ... }
// export default MyComponent  ← ERRO!

// ==========================================
// PADRÕES ESPECÍFICOS DO PROJETO
// ==========================================

/**
 * Exemplo com validação e sanitização
 */
/*
import { sanitizeInput, validateEmail, validateCNPJ } from '@/lib/api-helpers'

function FormComponent() {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cnpj: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    // ✅ Sempre sanitize inputs
    const cleanData = {
      nome: sanitizeInput(formData.nome),
      email: validateEmail(formData.email),
      cnpj: validateCNPJ(formData.cnpj)
    }

    if (!cleanData.email) {
      alert('Email inválido')
      return
    }

    // Enviar para API...
  }

  return <form onSubmit={handleSubmit}>...</form>
}
*/

/**
 * Exemplo com React Query
 */
/*
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function DataComponent() {
  const queryClient = useQueryClient()

  // ✅ Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const res = await fetch('/api/proposals')
      return res.json()
    }
  })

  // ✅ Mutation
  const mutation = useMutation({
    mutationFn: async (newData) => {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
    }
  })

  // ...
}
*/

/**
 * Exemplo com permissões RBAC
 */
/*
import { useAuth } from '@/components/auth/AuthProvider'
import { hasPermission } from '@/lib/rbac'

function ProtectedComponent() {
  const { user } = useAuth()

  // ✅ Verificar permissão
  if (!hasPermission(user, 'propostas', 'editar')) {
    return <p>Sem permissão para editar</p>
  }

  return <Button>Editar Proposta</Button>
}
*/
