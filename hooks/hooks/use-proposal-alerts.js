/**
 * Hook para gerenciar alertas SLA de propostas
 * Extrai lógica de notificações do componente principal
 */
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { safeStorage } from '@/lib/storage'

const SLA_THRESHOLD_HOURS = 8
const AGE_ALERT_HOURS = 24
const AGE_STRONG_ALERT_HOURS = 48

/**
 * Calcula horas entre duas datas
 */
function hoursBetween(dateA, dateB) {
  const a = dateA instanceof Date ? dateA : new Date(dateA)
  const b = dateB instanceof Date ? dateB : new Date(dateB)
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0
  return Math.abs(b - a) / (1000 * 60 * 60)
}

/**
 * Calcula idade da proposta em horas
 */
function calculateAge(proposal) {
  return hoursBetween(proposal.criado_em, new Date())
}

/**
 * Calcula resumo de SLA
 */
function calculateSLASummary(proposals) {
  const now = new Date()
  let slaBreached = 0
  let atRisk = 0

  proposals.forEach((p) => {
    if (p.atendido_por || p.status === 'implantado' || p.status === 'proposta declinada') {
      return // Ignorar já atendidas ou finalizadas
    }

    const age = hoursBetween(p.criado_em, now)

    if (age >= SLA_THRESHOLD_HOURS) {
      slaBreached++
    } else if (age >= SLA_THRESHOLD_HOURS * 0.7) {
      atRisk++
    }
  })

  return { slaBreached, atRisk, total: proposals.length }
}

/**
 * Hook principal para alertas SLA
 */
export function useProposalAlerts(proposals, userType) {
  const [slaSummary, setSlaSummary] = useState(null)
  const slaAlertedRef = useRef(new Set())

  // Atualiza resumo SLA periodicamente
  useEffect(() => {
    if (!proposals?.length) {
      setSlaSummary(null)
      return
    }

    const updateSummary = () => {
      const summary = calculateSLASummary(proposals)
      setSlaSummary(summary)
    }

    updateSummary()
    const interval = setInterval(updateSummary, 60000) // A cada 1 minuto

    return () => clearInterval(interval)
  }, [proposals])

  // Alertas individuais de SLA/aging
  useEffect(() => {
    if (!proposals?.length || userType === 'consultor') return

    const now = new Date()
    const sessionKey = `sla_alerts_${new Date().toISOString().split('T')[0]}`
    
    // Recupera alertas já enviados hoje
    const alertedToday = JSON.parse(safeStorage.getItem(sessionKey) || '[]')
    alertedToday.forEach((id) => slaAlertedRef.current.add(id))

    proposals.forEach((p) => {
      // Ignorar já atendidas ou finalizadas
      if (p.atendido_por || p.status === 'implantado' || p.status === 'proposta declinada') {
        return
      }

      // Evitar alertas duplicados
      if (slaAlertedRef.current.has(p.id)) return

      const age = hoursBetween(p.criado_em, now)
      const codigo = p.codigo || `#${p.id.slice(0, 8)}`

      // Alerta crítico: >48h
      if (age >= AGE_STRONG_ALERT_HOURS) {
        toast.error(`⚠️ Proposta ${codigo} parada há ${Math.floor(age)}h (URGENTE)`, {
          duration: 10000,
          action: {
            label: 'Ver',
            onClick: () => {
              window.dispatchEvent(
                new CustomEvent('focus-proposal', { detail: { codigo: p.codigo } })
              )
            },
          },
        })
        slaAlertedRef.current.add(p.id)
      }
      // Alerta moderado: >24h
      else if (age >= AGE_ALERT_HOURS) {
        toast.warning(`⏰ Proposta ${codigo} aguardando há ${Math.floor(age)}h`, {
          duration: 5000,
        })
        slaAlertedRef.current.add(p.id)
      }
      // Alerta básico: >8h (SLA)
      else if (age >= SLA_THRESHOLD_HOURS) {
        toast.info(`📋 SLA atingido: ${codigo} há ${Math.floor(age)}h sem atendimento`, {
          duration: 3000,
        })
        slaAlertedRef.current.add(p.id)
      }
    })

    // Persistir alertas enviados
    safeStorage.setItem(sessionKey, JSON.stringify(Array.from(slaAlertedRef.current)))
  }, [proposals, userType])

  // Limpa cache de alertas para propostas removidas
  useEffect(() => {
    if (!proposals?.length) return

    const currentIds = new Set(proposals.map((p) => p.id))
    const toRemove = []

    slaAlertedRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        toRemove.push(id)
      }
    })

    toRemove.forEach((id) => slaAlertedRef.current.delete(id))
  }, [proposals])

  return {
    slaSummary,
    slaAlertedIds: slaAlertedRef.current,
  }
}

export { SLA_THRESHOLD_HOURS, AGE_ALERT_HOURS, AGE_STRONG_ALERT_HOURS, calculateAge }
