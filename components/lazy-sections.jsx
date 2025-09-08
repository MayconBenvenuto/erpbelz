// Lazy loading das seções para code splitting
import { lazy, Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Lazy load das seções pesadas com prefetch dos chunks em idle
const loadProposalsSection = () => import(/* webpackPrefetch: true */ '@/app/sections/Proposals')
const loadReportsSection = () => import(/* webpackPrefetch: true */ '@/app/sections/Reports')
const loadMovimentacaoSection = () => import(/* webpackPrefetch: true */ '@/app/sections/Movimentacao')
const loadUsersSection = () => import(/* webpackPrefetch: true */ '@/app/sections/Users')
const loadDashboardSection = () => import(/* webpackPrefetch: true */ '@/app/sections/Dashboard')

const ProposalsSection = lazy(loadProposalsSection)
const ReportsSection = lazy(loadReportsSection)
const MovimentacaoSection = lazy(loadMovimentacaoSection)
const UsersSection = lazy(loadUsersSection)
const DashboardSectionLazy = lazy(loadDashboardSection)

// Sidebar e Header são leves, mantemos normalmente
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

// Dashboard agora também lazy para reduzir bundle inicial
export const DashboardSection = (props) => (
  <Suspense fallback={<SectionLoader message="Carregando dashboard..." />}>
    <DashboardSectionLazy {...props} />
  </Suspense>
)

// Export das seções leves
export { Sidebar, Header, EmDesenvolvimento, SectionLoader }

// Exporta preloads dos módulos para acionar o download do chunk ao passar o mouse
export const preloadProposalsSection = () => { try { loadProposalsSection() } catch {} }
export const preloadReportsSection = () => { try { loadReportsSection() } catch {} }
export const preloadMovimentacaoSection = () => { try { loadMovimentacaoSection() } catch {} }
export const preloadUsersSection = () => { try { loadUsersSection() } catch {} }
export const preloadDashboardSection = () => { try { loadDashboardSection() } catch {} }
