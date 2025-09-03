// Query Client configuration for performance optimization
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos por padrão
      staleTime: 5 * 60 * 1000,
      // Manter cache por 10 minutos após ficar stale
      gcTime: 10 * 60 * 1000,
      // Não refetch automático no window focus (ERP interno)
      refetchOnWindowFocus: false,
      // Retry só 1 vez para APIs internas
      retry: 1,
      // Não refetch no reconnect automático
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations críticas
      retry: 2,
    },
  },
})

// Query keys para tipagem e consistência
export const queryKeys = {
  // Propostas
  proposals: ['proposals'],
  proposalsFiltered: (filters) => ['proposals', 'filtered', filters],
  proposal: (id) => ['proposals', id],
  proposalAudit: (id) => ['proposals', id, 'audit'],
  proposalNotes: (id) => ['proposals', id, 'notes'],
  proposalTags: (id) => ['proposals', id, 'tags'],
  
  // Usuários
  users: ['users'],
  user: (id) => ['users', id],
  userGoals: ['user-goals'],
  userSessions: ['user-sessions'],
  
  // Solicitações
  solicitacoes: ['solicitacoes'],
  solicitacao: (id) => ['solicitacoes', id],
  
  // Clientes
  clientes: ['clientes'],
  cliente: (id) => ['clientes', id],
  
  // Reports
  reports: ['reports'],
  reportsPerformance: ['reports', 'performance'],
  reportsAlerts: ['reports', 'alerts'],
  
  // Dashboard
  dashboardStats: ['dashboard', 'stats'],
  dashboardCharts: ['dashboard', 'charts'],
}

// Invalidation helpers
export const invalidateQueries = {
  proposals: () => queryClient.invalidateQueries({ queryKey: queryKeys.proposals }),
  users: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  solicitacoes: () => queryClient.invalidateQueries({ queryKey: queryKeys.solicitacoes }),
  clientes: () => queryClient.invalidateQueries({ queryKey: queryKeys.clientes }),
  reports: () => queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
  dashboard: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
}

// Atualiza todas as caches de listas de propostas (incluindo variantes com filtros)
export function updateAllProposalsCaches(updater) {
  try {
    const queries = queryClient.getQueriesData({ queryKey: ['proposals'] })
    for (const [key, data] of queries) {
      if (Array.isArray(data)) {
        const next = updater(data)
        if (next && next !== data) queryClient.setQueryData(key, next)
      }
    }
  } catch { /* ignore */ }
}
