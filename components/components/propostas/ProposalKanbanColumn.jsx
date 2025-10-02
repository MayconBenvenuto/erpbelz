/**
 * Componente de coluna Kanban para propostas
 * Extraído de Proposals.jsx
 */
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProposalCard } from './ProposalCard'

/**
 * Coluna de kanban virtualizada
 */
export function ProposalKanbanColumn({
  status,
  proposals,
  statusColors,
  currentUser,
  canManage,
  onOpenDetails,
  onAssign,
  onStatusChange,
  updatingStatus,
  onPrefetch,
}) {
  const isUpdating = (id) => updatingStatus[id] === true

  return (
    <Card className="flex flex-col h-[calc(100vh-320px)] min-w-[320px]">
      {/* Header da coluna */}
      <div
        className="p-3 border-b flex items-center gap-2 text-sm font-medium capitalize sticky top-0 z-10"
        style={{
          backgroundColor: statusColors.bg,
          color: statusColors.text,
          borderColor: statusColors.border,
        }}
      >
        <span className="flex-1">{status}</span>
        <Badge
          variant="secondary"
          style={{
            backgroundColor: statusColors.text + '20',
            color: statusColors.text,
          }}
        >
          {proposals.length}
        </Badge>
      </div>

      {/* Lista de propostas */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {proposals.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Nenhuma proposta
          </div>
        ) : (
          proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onOpenDetails={onOpenDetails}
              onAssign={onAssign}
              onStatusChange={onStatusChange}
              currentUser={currentUser}
              canManage={canManage}
              isUpdating={isUpdating(proposal.id)}
              onPrefetch={onPrefetch}
            />
          ))
        )}
      </div>
    </Card>
  )
}
