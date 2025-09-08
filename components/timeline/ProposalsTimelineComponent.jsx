import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  User, 
  Calendar,
  AlertTriangle
} from 'lucide-react'
import { STATUS_COLORS } from '@/lib/constants'
import OperadoraBadge from '@/components/ui/operadora-badge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Configuração de ícones por status de proposta
const statusIcons = {
  'recepcionado': Activity,
  'em análise': Clock,
  'pendencias seguradora': AlertTriangle,
  'boleto liberado': CheckCircle2,
  'implantando': Activity,
  'pendente cliente': Clock,
  'pleito seguradora': AlertTriangle,
  'negado': XCircle,
  'implantado': CheckCircle2
}

// Helper para formatar datas
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Data inválida'
  }
}

const formatRelativeTime = (dateString) => {
  try {
    const date = new Date(dateString)
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
  } catch {
    return 'Data inválida'
  }
}

// Função para gerar dados da timeline baseados em propostas
const generateTimelineData = (proposals = []) => {
  const events = []
  
  proposals.forEach(proposal => {
    // Evento de criação
    events.push({
      id: `${proposal.id}-created`,
      type: 'creation',
      proposalId: proposal.id,
      proposalCode: proposal.codigo,
      title: `Proposta ${proposal.codigo} criada`,
      description: `CNPJ: ${proposal.cnpj} | Consultor: ${proposal.consultor}`,
      timestamp: proposal.criado_em,
      status: 'recepcionado',
      user: proposal.consultor,
      details: {
        cnpj: proposal.cnpj,
        operadora: proposal.operadora,
        valor: proposal.valor,
        quantidade_vidas: proposal.quantidade_vidas
      }
    })
    
    // Evento de atribuição (se houver)
    if (proposal.atendido_por && proposal.atendido_em) {
      events.push({
        id: `${proposal.id}-assigned`,
        type: 'assignment',
        proposalId: proposal.id,
        proposalCode: proposal.codigo,
        title: `Proposta ${proposal.codigo} atribuída`,
        description: `Atribuída para análise`,
        timestamp: proposal.atendido_em,
        status: proposal.status,
        user: proposal.atendido_por_nome || 'Analista',
        details: {
          status: proposal.status
        }
      })
    }
    
    // Evento de última atualização (se diferente da criação)
    if (proposal.updated_at && proposal.updated_at !== proposal.criado_em) {
      events.push({
        id: `${proposal.id}-updated`,
        type: 'status_change',
        proposalId: proposal.id,
        proposalCode: proposal.codigo,
        title: `Proposta ${proposal.codigo} atualizada`,
        description: `Status: ${proposal.status}`,
        timestamp: proposal.updated_at,
        status: proposal.status,
        user: proposal.atendido_por_nome || 'Sistema',
        details: {
          status: proposal.status
        }
      })
    }
  })
  
  // Ordenar por data (mais recente primeiro)
  return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

function ProposalsTimeline({ proposals = [], currentUser: _currentUser }) {
  const [selectedNode, setSelectedNode] = useState(null)
  const [timelineView, setTimelineView] = useState('recent') // 'recent' | 'today' | 'week'
  
  // Gerar dados da timeline
  const timelineData = useMemo(() => {
    const events = generateTimelineData(proposals)
    
    // Filtrar baseado na visualização selecionada
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    switch (timelineView) {
      case 'today':
        return events.filter(event => new Date(event.timestamp) >= today)
      case 'week':
        return events.filter(event => new Date(event.timestamp) >= weekAgo)
      case 'recent':
      default:
        return events.slice(0, 50) // Últimos 50 eventos
    }
  }, [proposals, timelineView])
  
  const handleNodeClick = (eventId) => {
    setSelectedNode(selectedNode === eventId ? null : eventId)
  }
  
  if (timelineData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Linha do Tempo - Propostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhuma atividade recente encontrada</p>
            <p className="text-sm">As atividades das propostas aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Linha do Tempo - Propostas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={timelineView === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimelineView('today')}
            >
              Hoje
            </Button>
            <Button
              variant={timelineView === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimelineView('week')}
            >
              7 dias
            </Button>
            <Button
              variant={timelineView === 'recent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimelineView('recent')}
            >
              Recentes
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {timelineData.length} evento{timelineData.length > 1 ? 's' : ''} registrado{timelineData.length > 1 ? 's' : ''}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Linha principal da timeline */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
          
          <div className="space-y-4">
            {timelineData.map((event, index) => {
              const isSelected = selectedNode === event.id
              const statusColors = STATUS_COLORS[event.status] || { bg: '#f6f6f6', text: '#333333', border: '#e2e2e2' }
              const IconComponent = statusIcons[event.status] || Activity
              const isLast = index === timelineData.length - 1
              
              return (
                <div key={event.id} className="relative flex items-start gap-4">
                  {/* Nó da timeline */}
                  <button
                    onClick={() => handleNodeClick(event.id)}
                    className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 shrink-0 ${
                      isSelected 
                        ? 'scale-110 shadow-lg' 
                        : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: statusColors.bg,
                      borderColor: statusColors.border,
                      color: statusColors.text
                    }}
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                  
                  {/* Conteúdo do evento */}
                  <div className={`flex-1 pb-4 transition-all duration-200 ${isLast ? 'pb-0' : ''}`}>
                    <div 
                      className={`rounded-lg border p-3 transition-all duration-200 cursor-pointer ${
                        isSelected ? 'shadow-md scale-[1.02]' : 'hover:shadow-sm'
                      }`}
                      onClick={() => handleNodeClick(event.id)}
                      style={{
                        backgroundColor: isSelected ? statusColors.bg + '20' : 'transparent',
                        borderColor: isSelected ? statusColors.border : 'var(--border)'
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm leading-tight mb-1">
                            {event.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{event.user}</span>
                            <Calendar className="h-3 w-3 ml-2" />
                            <span title={formatDate(event.timestamp)}>
                              {formatRelativeTime(event.timestamp)}
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="text-xs shrink-0"
                          style={{
                            backgroundColor: statusColors.bg + '40',
                            borderColor: statusColors.border,
                            color: statusColors.text
                          }}
                        >
                          {event.status}
                        </Badge>
                      </div>
                      
                      {/* Detalhes expandidos */}
                      {isSelected && event.details && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {event.details.cnpj && (
                              <div>
                                <span className="font-medium">CNPJ:</span> {event.details.cnpj}
                              </div>
                            )}
                            {event.details.operadora && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Operadora:</span> <OperadoraBadge nome={event.details.operadora} />
                              </div>
                            )}
                            {event.details.valor && (
                              <div>
                                <span className="font-medium">Valor:</span> R$ {event.details.valor?.toLocaleString('pt-BR')}
                              </div>
                            )}
                            {event.details.quantidade_vidas && (
                              <div>
                                <span className="font-medium">Vidas:</span> {event.details.quantidade_vidas}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ProposalsTimeline
