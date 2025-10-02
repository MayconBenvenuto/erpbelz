/**
 * Hook para fazer fetch com interceptação automática de erros 401
 *
 * Usage:
 * const { authFetch } = useAuthFetch()
 * const response = await authFetch('/api/endpoint', options)
 */

import { useCallback } from 'react'
import { authFetch as baseAuthFetch } from '@/lib/auth-interceptor'

export function useAuthFetch() {
  const authFetch = useCallback(async (url, options = {}) => {
    return await baseAuthFetch(url, options)
  }, [])

  return { authFetch }
}
