'use client'
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider'
import { QueryProvider } from '@/components/query-provider'
import { Toaster } from '@/components/ui/sonner'
import Sidebar from '@/app/sections/Sidebar'
import Header from '@/app/sections/Header'
import TopUserActions from '@/components/TopUserActions'
import MobileSidebar from '@/app/sections/MobileSidebar'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

function ProtectedShell({ children }) {
  const { currentUser, logout, loading, refreshCurrentUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Só redirecionar se já terminou bootstrap (loading false) e realmente não há usuário
    if (!loading && !currentUser) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/dashboard')}`)
    }
  }, [currentUser, loading, router, pathname])

  if (loading) return <div className="p-6 text-sm">Validando sessão...</div>
  if (!currentUser) return null // evitar flicker enquanto redireciona

  // Deriva aba ativa do pathname
  const activeTab = (() => {
    if (!pathname) return 'dashboard'
    const seg = pathname.split('/')[1] // '' | dashboard | propostas ...
    const map = {
      dashboard: 'dashboard',
      propostas: 'propostas',
      movimentacao: 'movimentacao',
      usuarios: 'usuarios',
      relatorios: 'relatorios',
      carteira: 'carteira',
      solicitacoes: 'solicitacoes',
    }
    return map[seg] || 'dashboard'
  })()

  const setActiveTab = (tab) => {
    const routeMap = {
      dashboard: '/dashboard',
      propostas: '/propostas',
      movimentacao: '/movimentacao',
      usuarios: '/usuarios',
      relatorios: '/relatorios',
      carteira: '/carteira',
      solicitacoes: '/solicitacoes',
    }
    const target = routeMap[tab] || '/dashboard'
    if (pathname !== target) router.push(target)
  }

  return (
    <div className="min-h-screen bg-background belz5-layout font-inter">
      <Toaster />
      <Sidebar currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="md:ml-64 min-h-screen flex flex-col">
        <Header
          currentUser={currentUser}
          activeTab={activeTab}
          leftSlot={
            <div className="md:hidden">
              <MobileSidebar
                currentUser={currentUser}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onLogout={logout}
              />
            </div>
          }
          rightSlot={
            <TopUserActions
              currentUser={currentUser}
              onLogout={logout}
              onRefresh={refreshCurrentUser}
            />
          }
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

export default function AppLayout({ children }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ProtectedShell>{children}</ProtectedShell>
      </AuthProvider>
    </QueryProvider>
  )
}
