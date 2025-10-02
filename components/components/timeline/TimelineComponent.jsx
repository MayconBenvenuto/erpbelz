import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Clock, CheckCircle2, XCircle, User, Calendar, FileText } from 'lucide-react'

// Configuração de cores e ícones por status
const statusConfig = {
  'aberta': { 
    color: 'bg-blue-500', 
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Activity, 
    label: 'Aberta' 
  },
  'em validação': { 
    color: 'bg-amber-500', 
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Clock, 
    label: 'Em Validação' 
  },
  'em execução': { 
    color: 'bg-purple-500', 
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: Activity, 
    label: 'Em Execução' 
  },
  'concluída': { 
    color: 'bg-green-500', 
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle2, 
    label: 'Concluída' 
  },
  'cancelada': { 
    color: 'bg-red-500', 
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle, 
    label: 'Cancelada' 
  }
}

// Helper para formatar datas
const formatDate = (date) => {
  try {
    return new Date(date).toLocaleDateString('pt-BR', {
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

// Helper para calcular tempo relativo
const getRelativeTime = (date) => {
  try {
    const now = new Date()
    const past = new Date(date)
    const diffMs = now - past
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffDays > 0) return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`
    if (diffHours > 0) return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`
    return 'Agora mesmo'
  } catch {
    return ''
  }
}

function SimpleTimeline({ solicitacoes = [] }) {
  const [selectedNode, setSelectedNode] = useState(null)
  const [detailVisible, setDetailVisible] = useState(false)

  // Exibe animação de entrada quando um nó é selecionado
  useEffect(() => {
    if (selectedNode) setDetailVisible(true)
  }, [selectedNode])

  const toggleNode = (id) => {
    const isSelected = selectedNode === id
    if (isSelected) {
      // animação de saída antes de desmontar
      setDetailVisible(false)
      setTimeout(() => setSelectedNode(null), 180)
    } else {
      setSelectedNode(id)
    }
  }
  // Processar dados para timeline (simplificado)
  const timelineData = solicitacoes
    .map(sol => ({
      id: sol.id,
      codigo: sol.codigo,
      razao_social: sol.razao_social,
      tipo: sol.tipo,
      subtipo: sol.subtipo,
      status: sol.status || 'aberta',
      timestamp: sol.criado_em,
      atualizado_em: sol.atualizado_em,
      criado_por_nome: sol.criado_por_nome,
      atendido_por_nome: sol.atendido_por_nome,
      observacoes: sol.observacoes
    }))
    .slice(0, 6) // Limite para caber na tela

  if (timelineData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma atividade encontrada</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Linha do Tempo - Movimentação
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full py-4">
          <div className="flex items-start justify-between w-full relative">
            {/* Linha de conexão horizontal */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gradient-to-r from-primary/50 via-primary/30 to-primary/50 rounded-full" />
            
            {timelineData.map((event) => {
              const config = statusConfig[event.status] || statusConfig['aberta']
              const Icon = config.icon
              const isSelected = selectedNode === event.id

              return (
                <div key={event.id} className="flex flex-col items-center flex-1 relative z-10">
                  {/* Nó da timeline */}
                  <div
                    className={`
                      w-10 h-10 rounded-full border-2 border-background shadow cursor-pointer
                      flex items-center justify-center transition-all duration-200
                      ${config.color} hover:shadow-md hover:scale-105
                      ${isSelected ? 'ring-2 ring-primary/30 scale-105' : ''}
                    `}
          onClick={() => toggleNode(event.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
            toggleNode(event.id)
                      }
                    }}
                    aria-label={`Detalhes da solicitação ${event.codigo}`}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  
                  {/* Label abaixo do nó */}
                  <div className="mt-3 text-center max-w-20">
                    <div className="text-[10px] font-medium text-foreground truncate">
                      {event.codigo}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-1">
                      {getRelativeTime(event.timestamp)}
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-[8px] px-1 py-0 h-4 mt-1 border ${config.textColor} ${config.borderColor} bg-white/90 dark:bg-white/10`}
                    >
                      {config.label}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Painel de detalhes */}
        {selectedNode && (
          <div className={`mt-4 transform transition-all duration-200 ${detailVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            {(() => {
              const event = timelineData.find(e => e.id === selectedNode)
              if (!event) return null
              
              const config = statusConfig[event.status] || statusConfig['aberta']
              const Icon = config.icon

              return (
                <Card className={`${config.bgColor} ${config.borderColor} border text-neutral-800 dark:text-neutral-100`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`${config.color} p-2 rounded-full flex-shrink-0`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-medium text-base">{event.codigo}</h4>
                          <Badge className={`text-xs ${config.textColor} border ${config.borderColor} bg-white/90 dark:bg-white/10 shadow-sm`}>{config.label}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium">Empresa:</span>
                            <span className="truncate">{event.razao_social}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                            <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium">Tipo:</span>
                            <span className="capitalize">
                              {event.tipo}{event.subtipo ? `/${event.subtipo}` : ''}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium">Criada em:</span>
                            <span>{formatDate(event.timestamp)}</span>
                          </div>
                          
                          {event.atualizado_em && event.atualizado_em !== event.timestamp && (
                            <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium">Atualizada em:</span>
                              <span>{formatDate(event.atualizado_em)}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium">Criada por:</span>
                            <span>{event.criado_por_nome || 'Sistema'}</span>
                          </div>
                          
                          {event.atendido_por_nome && (
                            <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium">Atendida por:</span>
                              <span>{event.atendido_por_nome}</span>
                            </div>
                          )}
                        </div>
                        
                        {event.observacoes && (
                          <div className="pt-3 border-t border-muted">
                            <div className="flex items-start gap-2 text-neutral-700 dark:text-neutral-300">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium text-sm">Observações:</span>
                                <p className="text-sm mt-1">{event.observacoes}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2 text-xs text-neutral-600 dark:text-neutral-400">
                          <p>Última atividade: {getRelativeTime(event.atualizado_em || event.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SimpleTimeline
