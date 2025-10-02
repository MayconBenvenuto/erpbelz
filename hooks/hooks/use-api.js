// Custom hooks para APIs com React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, invalidateQueries } from '@/lib/query-client'
import { toast } from 'sonner'

// Propostas
export function useProposals(filters = {}) {
  return useQuery({
    queryKey: queryKeys.proposalsFiltered(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
  // Padrão: lista mínima + primeira página para reduzir payload inicial
  if (!params.has('fields')) params.set('fields', 'list')
  if (!params.has('page')) params.set('page', '1')
  if (!params.has('pageSize')) params.set('pageSize', '50')
      
      const response = await fetch(`/api/proposals?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar propostas')
      return response.json()
    },
    // Aumenta janela de dado fresco para evitar flicker entre abas
    staleTime: 2 * 60 * 1000, // Reduzido para 2 minutos para responsividade
    // Sempre retorna um array para os consumidores (paginação retorna { data, page, ... })
    select: (data) => {
      if (Array.isArray(data)) return data
      if (data && Array.isArray(data.data)) return data.data
      return []
    },
  })
}

export function useProposal(id) {
  return useQuery({
    queryKey: queryKeys.proposal(id),
    queryFn: async () => {
      const response = await fetch(`/api/proposals/${id}`)
      if (!response.ok) throw new Error('Erro ao carregar proposta')
      return response.json()
    },
    enabled: !!id,
  })
}

export function useCreateProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (proposalData) => {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(proposalData),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao criar proposta')
      }
      return response.json()
    },
    onSuccess: (newProposal) => {
      // Adiciona a nova proposta às listas existentes
      queryClient.setQueriesData(
        { queryKey: ['proposals'] },
        (oldData) => {
          if (!oldData) return [newProposal]
          if (Array.isArray(oldData)) {
            return [newProposal, ...oldData]
          }
          if (oldData.data && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: [newProposal, ...oldData.data],
              total: (oldData.total || 0) + 1
            }
          }
          return oldData
        }
      )
      
      // Invalida apenas dashboard para agregações
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      
      toast.success('✅ Proposta criada com sucesso!')
      
      // Retorna a proposta para uso no callback
      return newProposal
    },
    onError: (error) => {
      toast.error(`❌ Erro ao criar proposta: ${error.message}`)
      throw error
    },
  })
}

export function useUpdateProposalStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, status, ...data }) => {
      const response = await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, ...data }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao atualizar status')
      }
      return response.json()
    },
    onSuccess: (updatedProposal, variables) => {
      // Atualiza cache específico da proposta
      queryClient.setQueryData(queryKeys.proposal(variables.id), updatedProposal)
      
      // Atualiza todas as queries de lista de propostas com os novos dados
      queryClient.setQueriesData(
        { queryKey: ['proposals'] },
        (oldData) => {
          if (!oldData) return oldData
          if (Array.isArray(oldData)) {
            return oldData.map(p => p.id === variables.id ? updatedProposal : p)
          }
          if (oldData.data && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.map(p => p.id === variables.id ? updatedProposal : p)
            }
          }
          return oldData
        }
      )
      
      // Invalidação mínima apenas para dashboard (que pode ter agregações)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      
      toast.success('✅ Status atualizado!')
    },
    onError: (error) => {
      toast.error(`❌ Erro ao atualizar status: ${error.message}`)
    },
  })
}

// Usuários
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
  const response = await fetch('/api/users?fields=list')
      if (!response.ok) throw new Error('Erro ao carregar usuários')
      return response.json()
    },
  staleTime: 15 * 60 * 1000,
  })
}

export function useUserGoals() {
  return useQuery({
    queryKey: queryKeys.userGoals,
    queryFn: async () => {
      const response = await fetch('/api/goals')
      if (!response.ok) throw new Error('Erro ao carregar metas')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Alias para compatibilidade
export const useGoals = useUserGoals

// Solicitações
export function useSolicitacoes(filters = {}) {
  return useQuery({
    queryKey: queryKeys.solicitacoes,
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
  if (!params.has('fields')) params.set('fields', 'list')
  if (!params.has('page')) params.set('page', '1')
  if (!params.has('pageSize')) params.set('pageSize', '50')
      
      const response = await fetch(`/api/solicitacoes?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar solicitações')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
    // Unifica forma de consumo: retorna sempre array
    select: (data) => {
      if (Array.isArray(data)) return data
      if (data && Array.isArray(data.data)) return data.data
      return []
    },
  })
}

export function useCreateSolicitacao() {
  return useMutation({
    mutationFn: async (solicitacaoData) => {
      const response = await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solicitacaoData),
      })
      if (!response.ok) throw new Error('Erro ao criar solicitação')
      return response.json()
    },
    onSuccess: () => {
      invalidateQueries.solicitacoes()
      invalidateQueries.dashboard()
      toast.success('✅ Solicitação criada!')
    },
    onError: (error) => {
      toast.error(`❌ Erro ao criar solicitação: ${error.message}`)
    },
  })
}

// Dashboard
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: async () => {
      const response = await fetch('/api/reports/dashboard')
      if (!response.ok) throw new Error('Erro ao carregar estatísticas')
      return response.json()
    },
  staleTime: 2 * 60 * 1000,
  })
}

// Reports
export function useReportsPerformance({ start, end, token, enabled } = {}) {
  const params = new URLSearchParams()
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  const queryString = params.toString()

  return useQuery({
    queryKey: queryKeys.reportsPerformance(start || null, end || null),
    queryFn: async () => {
  const url = queryString ? `/api/reports/performance?${queryString}` : '/api/reports/performance'
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const response = await fetch(url, { headers })
      if (!response.ok) throw new Error('Erro ao carregar relatórios')
      return response.json()
    },
    enabled: Boolean(enabled && start && end),
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnMount: false,
  })
}

// Hook genérico para refresh manual
export function useRefreshData() {
  const queryClient = useQueryClient()
  
  return {
    refreshAll: () => {
      queryClient.invalidateQueries()
      toast.success('🔄 Dados atualizados!')
    },
    refreshProposals: () => {
      invalidateQueries.proposals()
      toast.success('🔄 Propostas atualizadas!')
    },
    refreshDashboard: () => {
      invalidateQueries.dashboard()
      toast.success('🔄 Dashboard atualizado!')
    },
  }
}
