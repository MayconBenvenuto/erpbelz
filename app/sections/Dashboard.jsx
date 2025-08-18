'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FileText, Target, TrendingUp, RefreshCw } from 'lucide-react'
import { formatCurrency, getStatusBadgeClasses } from '@/lib/utils'
import { STATUS_OPTIONS } from '@/lib/constants'

export default function DashboardSection({ currentUser, proposals, users, sessions, userGoals }) {
  const totalProposals = proposals.length
  const implantedProposals = proposals.filter(p => p.status === 'implantado').length
  const totalValue = proposals.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0)
  const implantedValue = proposals.filter(p => p.status === 'implantado').reduce((sum, p) => sum + parseFloat(p.valor || 0), 0)
  const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meta - 200k</CardTitle>
          <CardDescription>Progresso baseado em propostas implantadas</CardDescription>
        </CardHeader>
        <CardContent>
          {userGoals.map((goal) => {
            if (goal.usuario_id === currentUser.id) {
              const target = Number(goal.valor_meta || 200000)
              const achieved = Number(goal.valor_alcancado || 0)
              const progress = (achieved / target) * 100
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{formatCurrency(achieved)} / {formatCurrency(target)}</span>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {progress >= 100 ? 'Meta atingida! 🎉' : `Faltam ${formatCurrency(target - achieved)} para atingir a meta`}
                  </p>
                </div>
              )
            }
            return null
          })}
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4" />
          <span>Atualização automática a cada 30s</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalProposals}</div>
            <p className="text-xs text-muted-foreground">Total no sistema</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas Implantadas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{implantedProposals}</div>
            <p className="text-xs text-muted-foreground">{totalProposals > 0 ? Math.round((implantedProposals / totalProposals) * 100) : 0}% de conversão</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Tota das Propostal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Pipeline completo</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Implantado</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{formatCurrency(implantedValue)}</div>
            <p className="text-xs text-muted-foreground">{totalValue > 0 ? Math.round((implantedValue / totalValue) * 100) : 0}% do total</p>
          </CardContent>
        </Card>
      </div>

      {currentUser.tipo_usuario === 'gestor' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Propostas por Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {STATUS_OPTIONS.map((status) => {
                const count = proposals.filter(p => normalize(p.status) === normalize(status)).length
                const percentage = totalProposals > 0 ? (count / totalProposals) * 100 : 0
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusBadgeClasses(status)}`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{count}</span>
                      <span className="text-xs text-muted-foreground ml-2">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Operadoras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(proposals.reduce((acc, p) => { acc[p.operadora] = (acc[p.operadora] || 0) + 1; return acc }, {}))
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([operadora, count]) => (
                  <div key={operadora} className="flex items-center justify-between">
                    <span className="capitalize">{operadora}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usuários Ativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between"><span>Total de Usuários</span><Badge variant="outline">{users.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Gestores</span><Badge variant="default">{users.filter(u => u.tipo_usuario === 'gestor').length}</Badge></div>
              <div className="flex items-center justify-between"><span>Analistas</span><Badge variant="secondary">{users.filter(u => u.tipo_usuario === 'analista').length}</Badge></div>
              <div className="flex items-center justify-between"><span>Sessões Ativas</span><Badge variant="destructive">{sessions.filter(s => !s.data_logout).length}</Badge></div>
            </CardContent>
          </Card>
        </div>
      )}

  {/* Meta movida para o topo */}
    </div>
  )
}
