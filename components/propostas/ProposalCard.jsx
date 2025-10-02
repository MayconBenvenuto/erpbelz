/**
 * Componente de card de proposta individual
 * Extraído de Proposals.jsx
 */
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Users,
  DollarSign,
  Calendar,
  User,
  Mail,
  Clock,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { calculateAge, AGE_ALERT_HOURS, AGE_STRONG_ALERT_HOURS } from '@/hooks/use-proposal-alerts'

/**
 * Formata valor monetário para BRL
 */
function formatMoneyBR(value) {
  const num = parseFloat(value)
  if (isNaN(num)) return 'R$ 0,00'

  // Limitar a 1 bilhão para evitar overflow de display
  const capped = Math.min(num, 1000000000)

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(capped)
}

/**
 * Formata data para exibição
 */
function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Card de proposta
 */
export function ProposalCard({
  proposal,
  onOpenDetails,
  onAssign,
  currentUser,
  canManage,
  isUpdating = false,
  onPrefetch,
}) {
  const age = calculateAge(proposal)
  const showAgeAlert = age >= AGE_ALERT_HOURS
  const showStrongAlert = age >= AGE_STRONG_ALERT_HOURS

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onMouseEnter={() => onPrefetch?.(proposal.id)}
      onClick={() => onOpenDetails(proposal.id)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Código e alertas */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs">
              {proposal.codigo || `#${proposal.id.slice(0, 8)}`}
            </Badge>
            {proposal._liveUpdate && (
              <Badge variant="secondary" className="text-xs">
                Atualizado
              </Badge>
            )}
          </div>

          {showAgeAlert && (
            <Badge
              variant={showStrongAlert ? 'destructive' : 'secondary'}
              className="text-xs flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              {Math.floor(age)}h
            </Badge>
          )}
        </div>

        {/* CNPJ e Cliente */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono">{proposal.cnpj || 'N/A'}</span>
          </div>
          {proposal.cliente_nome && (
            <div className="text-sm text-muted-foreground truncate">{proposal.cliente_nome}</div>
          )}
        </div>

        {/* Operadora */}
        {proposal.operadora && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span>{proposal.operadora}</span>
          </div>
        )}

        {/* Vidas e Valor */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{proposal.quantidade_vidas || 0} vidas</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="truncate">{formatMoneyBR(proposal.valor)}</span>
          </div>
        </div>

        {/* Previsão de Implantação */}
        {proposal.previsao_implantacao && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Previsão: {formatDate(proposal.previsao_implantacao)}</span>
          </div>
        )}

        {/* Consultor */}
        {proposal.consultor && (
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{proposal.consultor}</span>
            </div>
            {proposal.consultor_email && (
              <div className="flex items-center gap-2 pl-6">
                <Mail className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">
                  {proposal.consultor_email}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Atendido por */}
        {proposal.atendido_nome && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-primary" />
            <span className="font-medium">{proposal.atendido_nome}</span>
          </div>
        )}

        {/* Ações */}
        <div
          className="flex gap-2 pt-2"
          onClick={(e) => e.stopPropagation()} // Prevenir abertura de detalhes
        >
          {/* Botão Assumir (analista) */}
          {!proposal.atendido_por && !canManage && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onAssign(proposal.id)}
              disabled={isUpdating}
            >
              Assumir
            </Button>
          )}

          {/* Aviso de falta de documentos */}
          {proposal.atendido_por === currentUser.id && !proposal.tem_documentos && (
            <div className="flex-1 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
              <AlertCircle className="w-4 h-4" />
              <span>Sem documentos</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
