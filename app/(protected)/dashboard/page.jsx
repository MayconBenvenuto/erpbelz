'use client'
import { useAuth } from '@/components/auth/AuthProvider'
import DashboardSection from '@/app/sections/Dashboard'
import { useProposals, useUsers, useUserGoals, useSolicitacoes } from '@/hooks/use-api'

export default function DashboardPage() {
  const { currentUser } = useAuth()
  const { data: proposals = [] } = useProposals()
  const { data: users = [] } = useUsers()
  const { data: userGoals = [] } = useUserGoals()
  const { data: solicitacoes = [] } = useSolicitacoes()

  return (
    <div className="space-y-6">
      <DashboardSection
        currentUser={currentUser}
        proposals={proposals}
        users={users}
        userGoals={userGoals}
        solicitacoes={solicitacoes}
      />
    </div>
  )
}
