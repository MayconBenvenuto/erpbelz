import './globals.css'
import { SpeedInsights } from '@vercel/speed-insights/next'
import React from 'react'

function KeepAlivePing() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    let stopped = false
    const intervalMs = 2 * 60 * 1000 // 2 minutos
    const ping = async () => {
      if (stopped) return
      try { await fetch('/api/health', { cache: 'no-store' }) } catch (_) {}
      if (!stopped) setTimeout(ping, intervalMs)
    }
    // pequeno atraso inicial para não disputar com carregamento principal
    const t = setTimeout(ping, 20_000)
    return () => { stopped = true; clearTimeout(t) }
  }, [])
  return null
}

export const metadata = {
  title: 'Sistema de Gestão - Belz',
  description: 'Sistema completo de gestão de propostas com controle de usuários e metas',
  icons: {
    icon: '/logo-belz.jpg', // favicon padrão
    shortcut: '/logo-belz.jpg',
    apple: '/logo-belz.jpg',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/logo-belz.jpg" sizes="32x32" />
        <link rel="apple-touch-icon" href="/logo-belz.jpg" />
      </head>
    <body className="min-h-screen bg-background text-foreground antialiased scroll-smooth">
  {children}
  <KeepAlivePing />
  <SpeedInsights />
      </body>
    </html>
  )
}