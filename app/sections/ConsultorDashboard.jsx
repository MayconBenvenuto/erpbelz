'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FileText, Activity, Target, TrendingUp, CheckCircle2, Clock, User } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

/**
 * Dashboard específico para Consultor
 * Foca em pipeline pessoal das propostas criadas pelo consultor (ou associadas ao seu email)
 * e apresenta uma linha do tempo simples das últimas atividades.
 */
export default function ConsultorDashboardSection({ currentUser, proposals = [], userGoals = [] }) {
  // Filtra somente propostas do consultor (já devem vir filtradas, mas reforça)
  const myProposals = useMemo(() => {
    const email = String(currentUser.email || '').toLowerCase()
    return proposals.filter(p => (
      String(p.criado_por) === String(currentUser.id) ||
      (p.consultor_email && String(p.consultor_email).toLowerCase() === email)
    ))
  }, [proposals, currentUser])

  // Métricas
  const total = myProposals.length
  const aguardandoAnalista = myProposals.filter(p => !p.atendido_por).length
  const emAndamento = myProposals.filter(p => p.atendido_por && p.status !== 'implantado').length
  const implantadas = myProposals.filter(p => p.status === 'implantado').length
  const valorTotal = myProposals.reduce((s, p) => s + Number(p.valor || 0), 0)
  const valorImplantado = myProposals.filter(p => p.status === 'implantado').reduce((s, p) => s + Number(p.valor || 0), 0)
  const taxaConversao = total > 0 ? Math.round((implantadas / total) * 100) : 0
  const ticketMedio = total > 0 ? valorTotal / total : 0

  // Timeline simples (eventos principais)
  const timelineItems = useMemo(() => {
    return myProposals
      .map(p => ({
        id: p.id,
        codigo: p.codigo || p.id.slice(0, 8),
        status: p.status,
        criado_em: p.criado_em,
        atendido_em: p.atendido_em,
        implantado: p.status === 'implantado',
        valor: p.valor,
        atendido_por: p.atendido_por,
      }))
      .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
      .slice(0, 12) // últimas 12
  }, [myProposals])

  const formatDateTime = (dt) => {
    if (!dt) return '—'
    try { return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
  }

  // Meta individual (reusa mesma lógica do dashboard principal)
  const DEFAULT_TARGET = 200000
  const goal = userGoals.find(g => g.usuario_id === currentUser.id)
  const target = Number(goal?.valor_meta ?? DEFAULT_TARGET)
  const achievedFallback = myProposals
    .filter(p => p.status === 'implantado')
    .reduce((sum, p) => sum + Number(p.valor || 0), 0)
  const achieved = Number(goal?.valor_alcancado ?? achievedFallback)
  const progress = target > 0 ? (achieved / target) * 100 : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meta</CardTitle>
          <CardDescription>Progresso baseado em propostas implantadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Seu progresso</span>
              <span>{formatCurrency(achieved)} / {formatCurrency(target)}</span>
            </div>
            <Progress value={Math.min(Math.max(progress, 0), 100)} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {progress >= 100 ? 'Meta atingida! 🎉' : `Faltam ${formatCurrency(Math.max(0, target - achieved))} para atingir a meta`}
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">Seu Dashboard</h2>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>{currentUser.nome}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propostas Criadas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{total}</div>
            <p className="text-xs text-muted-foreground">Total que você abriu</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Analista</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{aguardandoAnalista}</div>
            <p className="text-xs text-muted-foreground">Sem responsável ainda</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{emAndamento}</div>
            <p className="text-xs text-muted-foreground">Já assumidas por analista</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Implantadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{implantadas}</div>
            <p className="text-xs text-muted-foreground">{taxaConversao}% de conversão</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{formatCurrency(valorTotal)}</div>
            <p className="text-xs text-muted-foreground">Pipeline bruto</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Implantado</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(valorImplantado)}</div>
            <p className="text-xs text-muted-foreground">{valorTotal > 0 ? Math.round((valorImplantado / valorTotal) * 100) : 0}% do total</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(ticketMedio || 0)}</div>
            <p className="text-xs text-muted-foreground">Valor médio por proposta</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progresso de conversão */}
      <Card>
        <CardHeader>
          <CardTitle>Conversão</CardTitle>
          <CardDescription>Percentual de propostas implantadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{implantadas} implantadas</span>
              <span>{taxaConversao}%</span>
            </div>
            <Progress value={taxaConversao} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Linha do Tempo</CardTitle>
          <CardDescription>Últimas movimentações das suas propostas</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineItems.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma proposta ainda.</p>
          )}
          <ul className="space-y-3">
            {timelineItems.map(item => (
              <li key={item.id} className="p-3 rounded-md border bg-card/50 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.status === 'implantado' ? 'bg-green-500' : item.atendido_por ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className="text-sm font-medium">{item.codigo}</p>
                    <p className="text-xs text-muted-foreground">Criado {formatDateTime(item.criado_em)}</p>
                  </div>
                </div>
                <div className="flex flex-col md:items-end gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs capitalize">{item.status}</Badge>
                    {item.atendido_em && <Badge variant="outline" className="text-xs">Assumida {formatDateTime(item.atendido_em)}</Badge>}
                    {item.implantado && <Badge className="text-xs bg-green-600 text-white">Implantado</Badge>}
                    {item.valor ? <Badge variant="outline" className="text-xs">{formatCurrency(item.valor)}</Badge> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
