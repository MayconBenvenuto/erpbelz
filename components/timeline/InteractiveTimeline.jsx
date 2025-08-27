'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  Clock, 
  Activity, 
  XCircle, 
  FileText, 
  User, 
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

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

// Animações do Framer Motion
const timelineVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const nodeVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300
    }
  },
  hover: {
    scale: 1.1,
    transition: {
      type: "spring",
      damping: 10,
      stiffness: 400
    }
  }
}

const lineVariants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: {
      duration: 0.8,
      ease: "easeInOut"
    }
  }
}

export default function InteractiveTimeline({ solicitacoes = [], currentUser: _currentUser }) {
  const [selectedNode, setSelectedNode] = useState(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollStartX, setScrollStartX] = useState(0)
  const scrollContainerRef = useRef(null)

  // Processar dados para timeline
  const timelineData = solicitacoes
    .flatMap(sol => {
      // Criar eventos baseados nas mudanças de status
      const events = []
      
      // Evento de criação
      events.push({
        id: `${sol.id}-created`,
        solicitacaoId: sol.id,
        codigo: sol.codigo,
        razao_social: sol.razao_social,
        tipo: sol.tipo,
        subtipo: sol.subtipo,
        status: 'aberta',
        timestamp: sol.criado_em,
        user: sol.criado_por_nome || 'Sistema',
        action: 'Criação',
        description: `Solicitação ${sol.codigo} criada`
      })

      // Evento de status atual (se diferente de aberta)
      if (sol.status !== 'aberta') {
        events.push({
          id: `${sol.id}-current`,
          solicitacaoId: sol.id,
          codigo: sol.codigo,
          razao_social: sol.razao_social,
          tipo: sol.tipo,
          subtipo: sol.subtipo,
          status: sol.status,
          timestamp: sol.atualizado_em || sol.criado_em,
          user: sol.atendido_por_nome || 'Sistema',
          action: 'Atualização',
          description: `Status alterado para ${sol.status}`
        })
      }

      return events
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Mais recentes primeiro

  // Verificar capacidade de scroll
  const checkScrollCapability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  useEffect(() => {
    checkScrollCapability()
    window.addEventListener('resize', checkScrollCapability)
    
    // Eventos globais para drag
    const handleGlobalMouseMove = (e) => handleMouseMove(e)
    const handleGlobalMouseUp = () => handleMouseUp()
    
    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('mouseup', handleGlobalMouseUp)
    }
    
    return () => {
      window.removeEventListener('resize', checkScrollCapability)
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [timelineData, isDragging, handleMouseMove, handleMouseUp])

  // Scroll smooth para esquerda/direita
  const scrollTimeline = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300
      const targetScroll = direction === 'left' 
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount

      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      })
    }
  }

  // Handlers para drag/touch
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true)
    setStartX(e.pageX)
    setScrollStartX(scrollContainerRef.current?.scrollLeft || 0)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX
    const walk = (x - startX) * 2
    scrollContainerRef.current.scrollLeft = scrollStartX - walk
  }, [isDragging, startX, scrollStartX])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchStart = useCallback((e) => {
    setIsDragging(true)
    setStartX(e.touches[0].pageX)
    setScrollStartX(scrollContainerRef.current?.scrollLeft || 0)
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || !scrollContainerRef.current) return
    const x = e.touches[0].pageX
    const walk = (x - startX) * 2
    scrollContainerRef.current.scrollLeft = scrollStartX - walk
  }, [isDragging, startX, scrollStartX])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  if (timelineData.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma atividade encontrada</p>
          <p className="text-sm">As ações realizadas aparecerão aqui</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Linha do Tempo</h3>
            <p className="text-sm text-muted-foreground">
              {timelineData.length} evento{timelineData.length > 1 ? 's' : ''} registrado{timelineData.length > 1 ? 's' : ''}
            </p>
          </div>
          
          {/* Controles de navegação */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => scrollTimeline('left')}
              disabled={!canScrollLeft}
              aria-label="Rolar para esquerda"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => scrollTimeline('right')}
              disabled={!canScrollRight}
              aria-label="Rolar para direita"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <TooltipProvider>
          <div className="relative">
            {/* Container com scroll horizontal */}
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent smooth-scroll pb-4 select-none"
              onScroll={checkScrollCapability}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              role="region"
              aria-label="Linha do tempo de atividades"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <motion.div
                className="flex items-center gap-4 min-w-max px-4"
                variants={timelineVariants}
                initial="hidden"
                animate="visible"
              >
                {timelineData.map((event, index) => {
                  const config = statusConfig[event.status] || statusConfig['aberta']
                  const Icon = config.icon
                  const isSelected = selectedNode === event.id

                  return (
                    <div key={event.id} className="flex items-center">
                      {/* Nó da timeline */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div
                            className="relative"
                            variants={nodeVariants}
                            whileHover="hover"
                            onClick={() => setSelectedNode(isSelected ? null : event.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setSelectedNode(isSelected ? null : event.id)
                              }
                            }}
                            aria-label={`${event.action}: ${event.description}`}
                          >
                            <div
                              className={`
                                w-12 h-12 rounded-full border-4 border-background shadow-lg cursor-pointer
                                flex items-center justify-center transition-all duration-200
                                ${config.color} hover:shadow-xl
                                ${isSelected ? 'ring-4 ring-primary/30' : ''}
                              `}
                            >
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            
                            {/* Indicador visual para seleção */}
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  className="absolute -inset-2 rounded-full border-2 border-primary"
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                />
                              )}
                            </AnimatePresence>
                          </motion.div>
                        </TooltipTrigger>
                        
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-2">
                            <div className="font-semibold">{event.codigo}</div>
                            <div className="text-sm">{event.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(event.timestamp)}
                            </div>
                            <Badge variant="secondary" className={config.textColor}>
                              {config.label}
                            </Badge>
                          </div>
                        </TooltipContent>
                      </Tooltip>

                      {/* Linha conectora */}
                      {index < timelineData.length - 1 && (
                        <motion.div
                          className="w-16 h-1 timeline-gradient mx-4 origin-left rounded-full"
                          variants={lineVariants}
                        />
                      )}
                    </div>
                  )
                })}
              </motion.div>
            </div>
          </div>
        </TooltipProvider>

        {/* Painel de detalhes */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 overflow-hidden"
            >
              {(() => {
                const event = timelineData.find(e => e.id === selectedNode)
                if (!event) return null
                
                const config = statusConfig[event.status] || statusConfig['aberta']
                const Icon = config.icon

                return (
                  <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`${config.color} p-3 rounded-full`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h4 className="font-semibold text-lg">{event.codigo}</h4>
                            <Badge className={config.textColor}>{config.label}</Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Empresa:</span>
                              <span>{event.razao_social}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Tipo:</span>
                              <span className="capitalize">
                                {event.tipo}{event.subtipo ? `/${event.subtipo}` : ''}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Data:</span>
                              <span>{formatDate(event.timestamp)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Responsável:</span>
                              <span>{event.user}</span>
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t border-muted">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Ação:</span> {event.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {getRelativeTime(event.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  )
}
