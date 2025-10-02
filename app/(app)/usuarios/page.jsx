'use client'
import { useAuth } from '@/components/auth/AuthProvider'
import { LazyUsersSection } from '@/components/lazy-sections'
import { useUsers, useProposals, useUserGoals } from '@/hooks/use-api'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
import { toast } from 'sonner'

export default function UsuariosPage() {
  const { currentUser, token } = useAuth()
  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useUsers()
  const { data: proposals = [] } = useProposals()
  const { data: userGoals = [], refetch: refetchGoals } = useUserGoals()
  const queryClient = useQueryClient()

  const handleCreateUser = async (userData) => {
    try {
      // Buscar token do sessionStorage (usado pelo AuthProvider)
      const authToken = token || sessionStorage.getItem('erp_token') || sessionStorage.getItem('crm_token')
      
      if (!authToken) {
        toast.error('Sessão expirada. Por favor, faça login novamente.')
        return
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          nome: userData.nome,
          email: userData.email,
          senha: userData.senha,
          tipo_usuario: userData.tipo_usuario,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Erro ao criar usuário')
        return
      }

      await response.json()
      toast.success('✅ Usuário criado com sucesso!')
      
      // Revalidar lista de usuários
      await refetchUsers()
      queryClient.invalidateQueries({ queryKey: queryKeys.users })
      
      // Chamar callback de sucesso se fornecido
      if (userData.afterSuccess) {
        userData.afterSuccess()
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      toast.error('❌ Erro ao criar usuário')
    }
  }

  const handleUpdateUserGoal = async (updateData) => {
    try {
      // Buscar token do sessionStorage (usado pelo AuthProvider)
      const authToken = token || sessionStorage.getItem('erp_token') || sessionStorage.getItem('crm_token')
      
      if (!authToken) {
        toast.error('Sessão expirada. Por favor, faça login novamente.')
        return
      }

      const response = await fetch('/api/goals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Erro ao atualizar meta')
        return
      }

      toast.success('✅ Meta atualizada com sucesso!')
      
      // Revalidar metas
      await refetchGoals()
      queryClient.invalidateQueries({ queryKey: queryKeys.userGoals })
      
      // Chamar callback de sucesso se fornecido
      if (updateData.afterSuccess) {
        updateData.afterSuccess()
      }
    } catch (error) {
      console.error('Erro ao atualizar meta:', error)
      toast.error('❌ Erro ao atualizar meta')
    }
  }

  const handleDeleteUser = async (userId) => {
    try {
      // Buscar token do sessionStorage (usado pelo AuthProvider)
      const authToken = token || sessionStorage.getItem('erp_token') || sessionStorage.getItem('crm_token')
      
      if (!authToken) {
        toast.error('Sessão expirada. Por favor, faça login novamente.')
        return
      }

      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Erro ao excluir usuário')
        return
      }

      toast.success('✅ Usuário excluído com sucesso!')
      
      // Revalidar lista de usuários
      await refetchUsers()
      queryClient.invalidateQueries({ queryKey: queryKeys.users })
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      toast.error('❌ Erro ao excluir usuário')
    }
  }

  if (!currentUser) return null
  
  return (
    <div className="space-y-6">
      <LazyUsersSection
        currentUser={currentUser}
        users={users}
        proposals={proposals}
        userGoals={userGoals}
        onCreateUser={handleCreateUser}
        onUpdateUserGoal={handleUpdateUserGoal}
        onDeleteUser={handleDeleteUser}
        isLoading={loadingUsers}
      />
    </div>
  )
}
