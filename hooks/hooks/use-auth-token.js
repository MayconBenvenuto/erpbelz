/**
 * Hook centralizado para gerenciar tokens de autenticação
 * Evita duplicação de lógica de recuperação de token
 */
import { useMemo } from 'react'
import { safeStorage } from '@/lib/storage'

/**
 * Retorna o token de autenticação atual
 * Verifica múltiplas chaves de sessionStorage por compatibilidade
 * @returns {string} Token JWT ou string vazia
 */
export function useAuthToken() {
  return useMemo(() => {
    if (typeof window === 'undefined') return ''
    
    return (
      safeStorage.getItem('erp_token') ||
      safeStorage.getItem('crm_token') ||
      ''
    )
  }, [])
}

/**
 * Retorna headers padrão para requisições autenticadas
 * @returns {HeadersInit} Headers com Authorization e Content-Type
 */
export function useAuthHeaders() {
  const token = useAuthToken()
  
  return useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    [token]
  )
}
