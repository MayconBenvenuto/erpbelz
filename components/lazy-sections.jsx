// Lazy loading das seções para code splitting
import { lazy, Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Lazy load das seções pesadas
const ProposalsSection = lazy(() => import('@/app/sections/Proposals'))
const ReportsSection = lazy(() => import('@/app/sections/Reports'))
const MovimentacaoSection = lazy(() => import('@/app/sections/Movimentacao'))
const UsersSection = lazy(() => import('@/app/sections/Users'))

// Dashboard e sidebar são leves, mantemos normalmente
import DashboardSection from '@/app/sections/Dashboard'
import Sidebar from '@/app/sections/Sidebar'
import Header from '@/app/sections/Header'
import EmDesenvolvimento from '@/app/sections/EmDesenvolvimento'

// Loading component otimizado
const SectionLoader = ({ message = "Carregando seção..." }) => (
  <Card className="h-96 flex items-center justify-center">
    <CardContent className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </CardContent>
  </Card>
)

// Wrapper com Suspense para cada seção
export const LazyProposalsSection = (props) => (
  <Suspense fallback={<SectionLoader message="Carregando propostas..." />}>
    <ProposalsSection {...props} />
  </Suspense>
)

export const LazyReportsSection = (props) => (
  <Suspense fallback={<SectionLoader message="Carregando relatórios..." />}>
    <ReportsSection {...props} />
  </Suspense>
)

export const LazyMovimentacaoSection = (props) => (
  <Suspense fallback={<SectionLoader message="Carregando movimentações..." />}>
    <MovimentacaoSection {...props} />
  </Suspense>
)

export const LazyUsersSection = (props) => (
  <Suspense fallback={<SectionLoader message="Carregando usuários..." />}>
    <UsersSection {...props} />
  </Suspense>
)

// Export das seções que não precisam de lazy loading
export {
  DashboardSection,
  Sidebar,
  Header,
  EmDesenvolvimento,
  SectionLoader
}
