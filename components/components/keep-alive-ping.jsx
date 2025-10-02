"use client"
import React from 'react'

// Periodicamente chama /api/health para manter a função edge fria e conexão ativa.
export default function KeepAlivePing() {
  React.useEffect(() => {
    let stopped = false
    const intervalMs = 2 * 60 * 1000 // 2 minutos
    const ping = async () => {
      if (stopped) return
      try { await fetch('/api/health', { cache: 'no-store' }) } catch (_) { /* silencioso */ }
      if (!stopped) setTimeout(ping, intervalMs)
    }
    // atraso inicial para não competir com requests iniciais críticos
    const t = setTimeout(ping, 20_000)
    return () => { stopped = true; clearTimeout(t) }
  }, [])
  return null
}
