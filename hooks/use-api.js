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
      
      const response = await fetch(`/api/proposals?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar propostas')
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutos para propostas (dados críticos)
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
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Erro ao carregar usuários')
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (dados menos críticos)
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
      
      const response = await fetch(`/api/solicitacoes?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar solicitações')
      return response.json()
    },
    staleTime: 3 * 60 * 1000, // 3 minutos
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
    staleTime: 1 * 60 * 1000, // 1 minuto para dashboard
  })
}

// Reports
export function useReportsData() {
  return useQuery({
    queryKey: queryKeys.reports,
    queryFn: async () => {
      const response = await fetch('/api/reports')
      if (!response.ok) throw new Error('Erro ao carregar relatórios')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
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
