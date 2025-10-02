'use client'
import { useAuth } from '@/components/auth/AuthProvider'
import { LazyProposalsSection } from '@/components/lazy-sections'
import { OPERADORAS as operadoras, STATUS_OPTIONS as statusOptions } from '@/lib/constants'
import { useProposals, useCreateProposal, useUpdateProposalStatus, useUsers, useUserGoals } from '@/hooks/use-api'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
import { toast } from 'sonner'

export default function PropostasPage() {
  const { currentUser } = useAuth()
  const { data: allProposals = [], isLoading } = useProposals()
  const { data: users = [] } = useUsers()
  const { data: userGoals = [] } = useUserGoals()
  const createProposalMutation = useCreateProposal()
  const updateStatusMutation = useUpdateProposalStatus()
  const queryClient = useQueryClient()

  const proposals = (() => {
    if (!currentUser) return []
    if (currentUser.tipo_usuario === 'gestor') return allProposals
    if (currentUser.tipo_usuario === 'consultor') {
      return allProposals.filter(p => String(p.criado_por) === String(currentUser.id) || (p.consultor_email && String(p.consultor_email).toLowerCase() === String(currentUser.email||'').toLowerCase()))
    }
    if (['analista_implantacao','analista_movimentacao'].includes(currentUser.tipo_usuario)) {
      return allProposals.filter(p => String(p.criado_por) === String(currentUser.id) || String(p.atendido_por) === String(currentUser.id) || !p.atendido_por)
    }
    return allProposals
  })()

  const handleCreateProposal = async (data) => {
    try {
      const result = await createProposalMutation.mutateAsync(data)
      return result
    } catch (error) {
      // Toast já é exibido pelo hook
      console.error('Erro ao criar proposta:', error)
      throw error
    }
  }

  const handleUpdateProposalStatus = async (id, status, _proposal) => {
    // Atualização otimista: atualiza a UI imediatamente
    const previousData = queryClient.getQueryData(queryKeys.proposalsFiltered({}))
    
    if (previousData && Array.isArray(previousData)) {
      const optimisticData = previousData.map(p => 
        p.id === id ? { ...p, status } : p
      )
      queryClient.setQueryData(queryKeys.proposalsFiltered({}), optimisticData)
    }
    
    try {
      await updateStatusMutation.mutateAsync({ id, status })
    } catch (error) {
      // Reverte a mudança otimista em caso de erro
      if (previousData) {
        queryClient.setQueryData(queryKeys.proposalsFiltered({}), previousData)
      }
      console.error('Erro ao atualizar status:', error)
    }
  }

  const handlePatchProposal = async (id, data) => {
    // Atualização otimista para campos gerais
    const previousData = queryClient.getQueryData(queryKeys.proposalsFiltered({}))
    
    if (previousData && Array.isArray(previousData)) {
      const optimisticData = previousData.map(p => 
        p.id === id ? { ...p, ...data } : p
      )
      queryClient.setQueryData(queryKeys.proposalsFiltered({}), optimisticData)
    }
    
    try {
      const token = sessionStorage.getItem('erp_token') || sessionStorage.getItem('crm_token') || ''
      const response = await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        // Reverte a mudança otimista em caso de erro
        if (previousData) {
          queryClient.setQueryData(queryKeys.proposalsFiltered({}), previousData)
        }
        const error = await response.json()
        throw new Error(error.message || 'Erro ao atualizar proposta')
      }
      
      const result = await response.json()
      
      // Atualiza com dados reais do servidor
      if (previousData && Array.isArray(previousData)) {
        const updatedData = previousData.map(p => 
          p.id === id ? result : p
        )
        queryClient.setQueryData(queryKeys.proposalsFiltered({}), updatedData)
      }
      
      toast.success('✅ Proposta atualizada com sucesso!')
      return { ok: true, data: result }
    } catch (error) {
      toast.error(`❌ Erro ao atualizar proposta: ${error.message}`)
      return { ok: false, error }
    }
  }

  return (
    <div className="space-y-6">
      <LazyProposalsSection
        currentUser={currentUser}
        proposals={proposals}
        operadoras={operadoras}
        statusOptions={statusOptions}
        onCreateProposal={handleCreateProposal}
        onUpdateProposalStatus={handleUpdateProposalStatus}
        onPatchProposal={handlePatchProposal}
        isLoading={isLoading}
        users={users}
        userGoals={userGoals}
      />
    </div>
  )
}
