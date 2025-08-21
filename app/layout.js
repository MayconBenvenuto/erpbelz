import './globals.css'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata = {
  title: 'CRM Propostas - Sistema de Gestão',
  description: 'Sistema completo de gestão de propostas com controle de usuários e metas',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background text-foreground">
  {children}
  <SpeedInsights />
      </body>
    </html>
  )
}