'use client'
import { LazyReportsSection } from '@/components/lazy-sections'
import { useProposals, useUsers } from '@/hooks/use-api'

export default function RelatoriosPage() {
  const { data: proposals = [], refetch: refetchProposals } = useProposals()
  const { data: users = [] } = useUsers()

  const handleRefresh = async () => {
    await refetchProposals()
  }

  return (
    <div className="space-y-6">
      <LazyReportsSection
        users={users}
        sessions={[]}
        proposals={proposals}
        onRefresh={handleRefresh}
      />
    </div>
  )
}
