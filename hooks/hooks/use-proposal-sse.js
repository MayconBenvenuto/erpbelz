/**
 * Hook para gerenciar conexão SSE de propostas
 * Extrai lógica de Server-Sent Events do componente principal
 */
import { useState, useEffect, useMemo } from 'react'
import { createSSEConnection } from '@/lib/sse-client'

/**
 * Hook para receber updates em tempo real de propostas via SSE
 */
export function useProposalSSE(userType) {
  const [liveUpdates, setLiveUpdates] = useState({})

  useEffect(() => {
    // SSE apenas para analistas e gestores
    if (!['analista_implantacao', 'analista_movimentacao', 'gerente', 'gestor'].includes(userType)) {
      return
    }

    let cleanup

    try {
      cleanup = createSSEConnection('/api/proposals/events', {
        eventTypes: ['proposta_update'],
        maxRetries: 10, // Propostas são críticas, tentar mais vezes
        initialDelay: 2000,
        maxDelay: 60000,
        onMessage: (event) => {
          try {
            const update = JSON.parse(event.data)
            if (update.id) {
              setLiveUpdates((prev) => ({
                ...prev,
                [update.id]: {
                  ...prev[update.id],
                  ...update,
                  _receivedAt: Date.now(),
                },
              }))
            }
          } catch (error) {
            console.error('[SSE] Erro ao parsear update:', error)
          }
        },
        onError: (error) => {
          console.warn('[SSE] Erro na conexão de propostas:', error)
        },
        onOpen: () => {
          // Conexão estabelecida
        },
      })
    } catch (error) {
      console.error('[SSE] Erro ao iniciar conexão:', error)
    }

    return () => {
      if (cleanup) cleanup()
    }
  }, [userType])

  return liveUpdates
}

/**
 * Merge de propostas com updates em tempo real
 */
export function useMergedProposals(proposals, liveUpdates) {
  return useMemo(() => {
    if (!proposals?.length) return []
    if (!Object.keys(liveUpdates).length) return proposals

    return proposals.map((p) => {
      const update = liveUpdates[p.id]
      if (!update) return p

      // Merge apenas campos seguros (status, atendido_por, etc)
      return {
        ...p,
        status: update.status ?? p.status,
        atendido_por: update.atendido_por ?? p.atendido_por,
        atendido_nome: update.atendido_nome ?? p.atendido_nome,
        atendido_em: update.atendido_em ?? p.atendido_em,
        _liveUpdate: true,
      }
    })
  }, [proposals, liveUpdates])
}
