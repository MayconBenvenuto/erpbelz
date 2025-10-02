/**
 * Interceptador de Autenticação
 *
 * Gerencia automaticamente:
 * - Detecção de erros 401 (token expirado/inválido)
 * - Limpeza de sessão
 * - Redirecionamento para login
 * - Feedback ao usuário
 */

import { toast } from 'sonner'

let logoutCallback = null
let isHandling401 = false

/**
 * Registra callback de logout do AuthProvider
 * Deve ser chamado uma vez na inicialização do AuthProvider
 */
export function registerLogoutCallback(callback) {
  logoutCallback = callback
}

/**
 * Intercepta resposta HTTP e trata erro 401 automaticamente
 * @param {Response} response - Resposta do fetch
 * @param {Object} options - Opções adicionais
 * @param {boolean} options.silent - Se true, não mostra toast nem redireciona
 * @returns {Response} - Mesma resposta para processamento downstream
 */
export async function interceptAuthError(response, options = {}) {
  const { silent = false } = options

  // Se recebeu 401 e não está já tratando
  if (response.status === 401 && !isHandling401 && !silent) {
    isHandling401 = true

    try {
      // Limpa sessão
      if (logoutCallback) {
        await logoutCallback()
      } else {
        // Fallback: limpa manualmente se callback não registrado
        clearSessionStorage()
      }

      // Mostra mensagem ao usuário
      toast.error('🔒 Sessão expirada. Por favor, faça login novamente.')

      // Aguarda um momento para o toast ser visível
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Redireciona para login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('[AUTH-INTERCEPTOR] Erro ao processar 401:', error)
    } finally {
      // Reseta flag após 2 segundos para permitir novo tratamento se necessário
      setTimeout(() => {
        isHandling401 = false
      }, 2000)
    }
  }

  return response
}

/**
 * Wrapper para fetch que automaticamente intercepta erros 401
 * Use este em vez do fetch nativo para ter interceptação automática
 */
export async function authFetch(url, options = {}) {
  try {
    const response = await fetch(url, options)

    // Intercepta 401 automaticamente
    await interceptAuthError(response, options)

    return response
  } catch (error) {
    // Erros de rede, etc
    throw error
  }
}

/**
 * Limpa dados de sessão do storage
 */
function clearSessionStorage() {
  try {
    const keys = [
      'erp_user',
      'erp_session',
      'erp_token',
      'erp_last_activity',
      'crm_user',
      'crm_session',
      'crm_token',
      'crm_last_activity',
    ]
    keys.forEach((k) => sessionStorage.removeItem(k))
  } catch (error) {
    console.error('[AUTH-INTERCEPTOR] Erro ao limpar sessionStorage:', error)
  }
}

/**
 * Verifica manualmente se uma resposta de API tem erro 401
 * Útil quando não usa authFetch mas quer tratamento manual
 */
export async function checkAuth(response) {
  if (response.status === 401) {
    await interceptAuthError(response)
    return false
  }
  return true
}

/**
 * Reseta o estado do interceptador (útil para testes)
 */
export function resetInterceptor() {
  isHandling401 = false
  logoutCallback = null
}
