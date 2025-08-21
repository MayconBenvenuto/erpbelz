import './globals.css'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata = {
  title: 'CRM Propostas - Sistema de Gestão',
  description: 'Sistema completo de gestão de propostas com controle de usuários e metas',
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
      <body className="min-h-screen bg-background text-foreground antialiased scroll-smooth">
  {children}
  <SpeedInsights />
      </body>
    </html>
  )
}