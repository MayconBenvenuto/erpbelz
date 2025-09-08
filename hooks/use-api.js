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
    staleTime: 5 * 60 * 1000,
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
  return useMutation({
    mutationFn: async (proposalData) => {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposalData),
      })
      if (!response.ok) throw new Error('Erro ao criar proposta')
      return response.json()
    },
    onSuccess: () => {
      invalidateQueries.proposals()
      invalidateQueries.dashboard()
      toast.success('✅ Proposta criada com sucesso!')
    },
    onError: (error) => {
      toast.error(`❌ Erro ao criar proposta: ${error.message}`)
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
        body: JSON.stringify({ status, ...data }),
      })
      if (!response.ok) throw new Error('Erro ao atualizar status')
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Atualizar cache otimista
      queryClient.setQueryData(queryKeys.proposal(variables.id), data)
      invalidateQueries.proposals()
      invalidateQueries.dashboard()
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
export function useReportsData() {
  return useQuery({
    queryKey: queryKeys.reportsPerformance,
    queryFn: async () => {
      const response = await fetch('/api/reports/performance')
      if (!response.ok) throw new Error('Erro ao carregar relatórios')
      return response.json()
    },
  staleTime: 10 * 60 * 1000,
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
