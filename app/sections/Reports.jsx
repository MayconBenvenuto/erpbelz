'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Clock, TrendingUp, RefreshCw, Target, AlertTriangle, Download } from 'lucide-react'
import { formatCurrency, formatCNPJ, getStatusBadgeClasses } from '@/lib/utils'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import OperadoraBadge from '@/components/ui/operadora-badge'

export default function ReportsSection({
  users,
  sessions,
  proposals,
  onRefresh,
  currentUser,
  token,
}) {
  const [refreshing, setRefreshing] = useState(false)
  const [perf, setPerf] = useState(null)
  // Estados para alertas de propostas estagnadas
  const [alertsInfo, setAlertsInfo] = useState(null)
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [triggeringAlert, setTriggeringAlert] = useState(false)
  // Heurística de sessão ativa (alinhada ao endpoint /api/users/online):
  //  - data_logout encerra a sessão
  //  - expirado_em no passado encerra a sessão
  //  - considera ativo apenas se houve atividade (ultimo_ping legado ou ultimo_refresh) nos últimos 5 minutos
  //    (removido fallback anterior de "criado_em < 8h" que marcava usuários como online indevidamente)
  const isSessionActive = useCallback((s) => {
    const now = Date.now()
    if (!s) return false
    if (s.data_logout) return false
    if (s.expirado_em && new Date(s.expirado_em).getTime() <= now) return false
    const lastActivity = s.ultimo_ping || s.ultimo_refresh
    if (!lastActivity) return false
    return now - new Date(lastActivity).getTime() < 5 * 60 * 1000
  }, [])
  const [loadingPerf, setLoadingPerf] = useState(false)
  const [start, setStart] = useState(() =>
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  )
  const [end, setEnd] = useState(() =>
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10)
  )
  // Filtrar gestores do monitoramento
  const analystUsers = useMemo(
    () => (Array.isArray(users) ? users.filter((u) => u.tipo_usuario !== 'gestor') : []),
    [users]
  )
  const analystIds = new Set(analystUsers.map((u) => u.id))
  const [onlineUsers, setOnlineUsers] = useState([])
  const [windowSec, setWindowSec] = useState(120)
  const filteredSessions = Array.isArray(sessions)
    ? sessions.filter((s) => analystIds.has(s.usuario_id))
    : []

  // Função para saber se usuário está online (view + fallback sessão ativa)
  const userIsOnline = useCallback(
    (user) => {
      const onlineSet = new Set(onlineUsers.map((u) => String(u.id)))
      if (onlineSet.has(String(user.id))) return true
      // fallback pela sessão ativa (caso view ainda não atualizou)
      const userSessions = (sessions || []).filter((s) => s.usuario_id === user.id)
      return userSessions.some((s) => isSessionActive(s))
    },
    [onlineUsers, sessions, isSessionActive]
  )

  // Ordenação: online primeiro (alfabética), depois offline (alfabética)
  const sortedAnalystUsers = useMemo(() => {
    return [...analystUsers].sort((a, b) => {
      const aOnline = userIsOnline(a)
      const bOnline = userIsOnline(b)
      if (aOnline && !bOnline) return -1
      if (!aOnline && bOnline) return 1
      return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
    })
  }, [analystUsers, userIsOnline])

  // Utilitários de formatação da "última atividade" para transparência
  const formatAgo = useCallback((dateStr) => {
    if (!dateStr) return 'desconhecida'
    const d = new Date(dateStr)
    if (isNaN(d)) return 'inválida'
    const diffMs = Date.now() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'agora'
    if (diffMin < 60) return `${diffMin}m`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return diffH >= 2 ? `${diffH}h` : '1h'
    const diffD = Math.floor(diffH / 24)
    return diffD === 1 ? '1d' : `${diffD}d`
  }, [])

  const onlineCount = useMemo(
    () => sortedAnalystUsers.filter((u) => userIsOnline(u)).length,
    [sortedAnalystUsers, userIsOnline]
  )
  const filteredProposals = Array.isArray(proposals)
    ? proposals.filter((p) => analystIds.has(p.criado_por))
    : []
  const loadOnlineUsers = useCallback(async () => {
    if (currentUser?.tipo_usuario !== 'gestor') return
    try {
      const res = await fetch(`/api/users/online?window_seconds=${windowSec}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (res.ok) setOnlineUsers(Array.isArray(data.data) ? data.data : [])
    } catch {}
  }, [currentUser?.tipo_usuario, token, windowSec])

  useEffect(() => {
    loadOnlineUsers()
  }, [loadOnlineUsers])
  useEffect(() => {
    if (currentUser?.tipo_usuario !== 'gestor') return
    const id = setInterval(loadOnlineUsers, 60000)
    return () => clearInterval(id)
  }, [currentUser?.tipo_usuario, loadOnlineUsers])

  const loadPerformance = async () => {
    if (currentUser?.tipo_usuario !== 'gestor') return
    setLoadingPerf(true)
    try {
      const res = await fetch(`/api/reports/performance?start=${start}&end=${end}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) return
      const data = await res.json()
      setPerf(data)
    } catch (_) {
      // silencioso no relatório
    } finally {
      setLoadingPerf(false)
    }
  }

  useEffect(() => {
    loadPerformance()
    if (currentUser?.tipo_usuario === 'gestor') {
      loadAlertsInfo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Carrega informações dos alertas
  const loadAlertsInfo = async () => {
    if (currentUser?.tipo_usuario !== 'gestor') return
    setLoadingAlerts(true)
    try {
      const res = await fetch('/api/alerts/stale-proposals', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setAlertsInfo(data)
      }
    } catch (err) {
      console.error('Erro ao carregar alertas:', err)
    } finally {
      setLoadingAlerts(false)
    }
  }

  // Executa verificação manual de alertas
  const triggerStaleCheck = async () => {
    if (currentUser?.tipo_usuario !== 'gestor') return
    setTriggeringAlert(true)
    try {
      const res = await fetch('/api/alerts/stale-proposals', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`✅ Verificação executada! ${data.notified || 0} propostas notificadas.`)
        await loadAlertsInfo() // Recarrega info
      } else {
        toast.error(`❌ Erro: ${data.error || 'Falha na verificação'}`)
      }
    } catch (err) {
      console.error('Erro ao executar alerta:', err)
      toast.error('❌ Erro de conexão ao executar verificação')
    } finally {
      setTriggeringAlert(false)
    }
  }
  return (
    <div className="space-y-6">
      {currentUser?.tipo_usuario === 'gestor' && (
        <section className="space-y-4">
          <div className="flex items-end gap-2">
            <div>
              <label className="text-sm block mb-1">Início</label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="text-sm block mb-1">Fim</label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <Button onClick={loadPerformance} disabled={loadingPerf} className="ml-auto">
              {loadingPerf ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>

          {/* Seção de Alertas de Propostas Estagnadas */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Sistema de Alertas - Propostas Estagnadas
              </CardTitle>
              <CardDescription>
                Monitora propostas em análise há mais de 48h e envia notificações automáticas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {loadingAlerts ? '...' : alertsInfo?.propostas_48h || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Propostas há +48h</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {loadingAlerts ? '...' : alertsInfo?.propostas_72h || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Críticas (+72h)</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-sm text-muted-foreground">Último check</div>
                  <div className="font-medium">
                    {loadingAlerts ? 'Carregando...' : alertsInfo?.ultimo_check || 'Nunca'}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={triggerStaleCheck}
                  disabled={triggeringAlert}
                  variant="outline"
                  size="sm"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {triggeringAlert ? 'Executando...' : 'Verificar Agora'}
                </Button>
                <Button
                  onClick={loadAlertsInfo}
                  disabled={loadingAlerts}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingAlerts ? 'animate-spin' : ''}`} />
                  {loadingAlerts ? 'Carregando...' : 'Atualizar Status'}
                </Button>
              </div>

              {alertsInfo?.detalhes && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-primary">
                    Ver propostas estagnadas
                  </summary>
                  <div className="mt-2 space-y-2">
                    {alertsInfo.detalhes.propostas_48h?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-orange-600 mb-2">Propostas há +48h:</h4>
                        {alertsInfo.detalhes.propostas_48h.map((p, i) => (
                          <div
                            key={i}
                            className="text-xs bg-orange-50 dark:bg-orange-950/20 p-2 rounded"
                          >
                            <strong>{p.codigo}</strong> - {p.cnpj} - {p.consultor} ({p.horas_parado}
                            h parado)
                          </div>
                        ))}
                      </div>
                    )}
                    {alertsInfo.detalhes.propostas_72h_criticas?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-600 mb-2">
                          Propostas críticas (+72h):
                        </h4>
                        {alertsInfo.detalhes.propostas_72h_criticas.map((p, i) => (
                          <div key={i} className="text-xs bg-red-50 dark:bg-red-950/20 p-2 rounded">
                            <strong>{p.codigo}</strong> - {p.cnpj} - {p.consultor} ({p.horas_parado}
                            h parado)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded text-xs">
                <strong>Agendamento:</strong> A verificação pode ser disparada manualmente aqui ou
                por um serviço de cron externo (ex.: cron-job.org) configurado para 09:00 BRT.
                Propostas em análise entre 48h-72h geram notificação por e-mail para todos os
                gestores.
              </div>
            </CardContent>
          </Card>

          {perf && (
            <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4">
              <Card className="2xl:col-span-3">
                <CardHeader>
                  <CardTitle>Painel de Desempenho</CardTitle>
                  <CardDescription>Métricas ampliadas de propostas e implantação</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 xl:grid-cols-6 gap-4">
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>KPIs Básicos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total</span>
                        <strong>{perf.kpis?.total_propostas ?? 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Implantadas</span>
                        <strong>{perf.kpis?.implantadas ?? 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Conversão</span>
                        <strong>{perf.kpis?.taxa_conversao_final ?? 0}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Vidas</span>
                        <strong>{perf.kpis?.vidas_totais ?? 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor Implantado</span>
                        <strong>
                          R$ {Number(perf.kpis?.valor_implantado || 0).toLocaleString('pt-BR')}
                        </strong>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>Financeiro</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Ticket Médio</span>
                        <strong>
                          R${' '}
                          {Number(perf.kpis?.ticket_medio_geral || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Desv.Padrão</span>
                        <strong>
                          R${' '}
                          {Number(perf.kpis?.ticket_desvio_padrao || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Forecast</span>
                        <strong>
                          R${' '}
                          {Number(perf.kpis?.forecast_valor_ponderado || 0).toLocaleString(
                            'pt-BR',
                            { minimumFractionDigits: 0 }
                          )}
                        </strong>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>Tempos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Lead Time</span>
                        <strong>{perf.kpis?.lead_time_medio_dias ?? 0}d</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>1º Avanço</span>
                        <strong>{perf.kpis?.tempo_medio_primeiro_avanco_dias ?? 0}d</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Aging Médio</span>
                        <strong>{perf.kpis?.aging_medio_dias ?? 0}d</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>SLA Implantação</span>
                        <strong>{perf.kpis?.sla_implantacao_pct ?? 0}%</strong>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>Qualidade</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Perdas</span>
                        <strong>{perf.kpis?.propostas_negadas ?? 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxa Perda</span>
                        <strong>{perf.kpis?.taxa_perda_pct ?? 0}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Recup. Estagnação</span>
                        <strong>{perf.kpis?.recuperacoes_estagnacao ?? 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Retrabalho</span>
                        <strong>{perf.kpis?.retrabalho_pct ?? 0}%</strong>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>Run Rate</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Run Rate (dia)</span>
                        <strong>{perf.kpis?.run_rate_implantacao ?? 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Prev. Mês</span>
                        <strong>{perf.kpis?.previsao_fim_mes_implantadas ?? 0}</strong>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle>Meta / Parâmetros</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div>SLA dias: {perf.meta_info?.sla_dias}</div>
                      <div>Estagnação dias: {perf.meta_info?.estagnacao_dias}</div>
                    </CardContent>
                  </Card>

                  <Card className="col-span-2 xl:col-span-3">
                    <CardHeader className="py-3">
                      <CardTitle>Funil (Qtd)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perf.funilStatus || []}>
                          <XAxis dataKey="status" hide />
                          <YAxis hide />
                          <Tooltip />
                          <Bar dataKey="total" fill="#130E54" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="col-span-2 xl:col-span-2">
                    <CardHeader className="py-3">
                      <CardTitle>Pipeline Valor</CardTitle>
                    </CardHeader>
                    <CardContent className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perf.pipelineValor || []}>
                          <XAxis dataKey="status" hide />
                          <YAxis hide />
                          <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR')}`} />
                          <Bar dataKey="valor_total" fill="#021d79" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="col-span-2 xl:col-span-1">
                    <CardHeader className="py-3">
                      <CardTitle>Vidas por Operadora</CardTitle>
                    </CardHeader>
                    <CardContent className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perf.vidasPorOperadora || []}>
                          <XAxis dataKey="operadora" hide />
                          <YAxis hide />
                          <Tooltip />
                          <Bar dataKey="vidas_total" fill="#6b7cff" />
                        </BarChart>
                      </ResponsiveContainer>
                      {/* Lista compacta com logos para consistência visual */}
                      <div className="mt-2 space-y-1">
                        {(perf.vidasPorOperadora || []).slice(0, 5).map((o) => (
                          <div
                            key={o.operadora}
                            className="flex items-center justify-between text-xs"
                          >
                            <OperadoraBadge nome={o.operadora} size={14} />
                            <span className="font-medium">{o.vidas_total}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ranking Usuários (Analistas/Consultores)</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Propostas</TableHead>
                        <TableHead>Implantadas</TableHead>
                        <TableHead>Ticket Médio</TableHead>
                        <TableHead>Vidas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(perf.rankingUsuarios || []).map((r) => (
                        <TableRow key={r.usuario_id || r.nome}>
                          <TableCell>{r.nome}</TableCell>
                          <TableCell>{r.total_propostas}</TableCell>
                          <TableCell>
                            {r.implantadas} ({r.taxa_implantacao}%)
                          </TableCell>
                          <TableCell>
                            R${' '}
                            {Number(r.ticket_medio || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>{r.vidas_total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ranking por Consultor</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Consultor</TableHead>
                        <TableHead>Propostas</TableHead>
                        <TableHead>Implantadas</TableHead>
                        <TableHead>Ticket Médio</TableHead>
                        <TableHead>Vidas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(perf.rankingConsultores || []).map((r) => (
                        <TableRow key={r.consultor}>
                          <TableCell>{r.consultor}</TableCell>
                          <TableCell>{r.total_propostas}</TableCell>
                          <TableCell>
                            {r.implantadas} ({r.taxa_implantacao}%)
                          </TableCell>
                          <TableCell>
                            R${' '}
                            {Number(r.ticket_medio || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>{r.vidas_total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ranking por Consultor (E-mail)</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Propostas</TableHead>
                        <TableHead>Implantadas</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(perf.rankingConsultoresEmail || []).map((r) => (
                        <TableRow key={r.consultor_email}>
                          <TableCell>{r.consultor_email}</TableCell>
                          <TableCell>{r.nome_usuario || '-'}</TableCell>
                          <TableCell>{r.total_propostas}</TableCell>
                          <TableCell>
                            {r.implantadas} ({r.taxa_implantacao}%)
                          </TableCell>
                          <TableCell>
                            R$ {Number(r.valor_total || 0).toLocaleString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Relatórios e Monitoramento</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              setRefreshing(true)
              await onRefresh?.()
            } finally {
              setRefreshing(false)
            }
          }}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando…' : 'Atualizar Dados'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Usuários Online</p>
                <p className="text-2xl font-bold text-green-600">{onlineCount}</p>
              </div>
              {currentUser?.tipo_usuario === 'gestor' && (
                <div className="ml-auto flex items-center gap-2">
                  <select
                    value={windowSec}
                    onChange={(e) => setWindowSec(parseInt(e.target.value) || 120)}
                    className="text-xs border rounded px-1 py-0.5 bg-background"
                  >
                    <option value={60}>1 min</option>
                    <option value={120}>2 min</option>
                    <option value={300}>5 min</option>
                    <option value={600}>10 min</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const url = `/api/users/online?format=csv&window_seconds=${windowSec}`
                        const res = await fetch(url, {
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        })
                        if (!res.ok) {
                          toast.error('Falha ao exportar')
                          return
                        }
                        const blob = await res.blob()
                        const href = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = href
                        a.download = `usuarios_online_${Date.now()}.csv`
                        document.body.appendChild(a)
                        a.click()
                        a.remove()
                        URL.revokeObjectURL(href)
                      } catch {
                        toast.error('Erro de rede na exportação')
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Sessões Hoje</p>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    filteredSessions.filter((s) => {
                      const base = s.data_login || s.criado_em || s.ultimo_refresh
                      if (!base) return false
                      const d = new Date(base)
                      return !isNaN(d) && d.toDateString() === new Date().toDateString()
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Propostas Hoje</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {
                    filteredProposals.filter(
                      (p) => new Date(p.criado_em).toDateString() === new Date().toDateString()
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio Implantação</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(() => {
                    const implantedProps = proposals.filter(
                      (p) => p.status === 'implantado' && p.criado_em
                    )
                    if (implantedProps.length === 0) return '0d'
                    const avgDays =
                      implantedProps.reduce((acc, p) => {
                        const created = new Date(p.criado_em)
                        const implanted = new Date(p.atualizado_em || p.criado_em)
                        const diffDays = Math.ceil((implanted - created) / (1000 * 60 * 60 * 24))
                        return acc + diffDays
                      }, 0) / implantedProps.length
                    return Math.round(avgDays) + 'd'
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Monitoramento Detalhado de Acesso</span>
          </CardTitle>
          <CardDescription>Controle completo de sessões e atividades dos usuários</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedAnalystUsers.map((user) => {
              const userSessions = sessions.filter((s) => s.usuario_id === user.id)
              const currentSession = userSessions.find((s) => isSessionActive(s))
              const todaySessions = userSessions.filter((s) => {
                const base = s.data_login || s.criado_em || s.ultimo_refresh
                if (!base) return false
                const d = new Date(base)
                return !isNaN(d) && d.toDateString() === new Date().toDateString()
              })
              // Determina última atividade conhecida (preferindo ultimo_ping -> ultimo_refresh -> data_login)
              let lastActivity = null
              if (userSessions.length) {
                const sortedByActivity = [...userSessions].sort((a, b) => {
                  const atA = new Date(
                    a.ultimo_ping || a.ultimo_refresh || a.data_login || a.criado_em || 0
                  ).getTime()
                  const atB = new Date(
                    b.ultimo_ping || b.ultimo_refresh || b.data_login || b.criado_em || 0
                  ).getTime()
                  return atB - atA
                })
                const latest = sortedByActivity[0]
                lastActivity =
                  latest?.ultimo_ping ||
                  latest?.ultimo_refresh ||
                  latest?.data_login ||
                  latest?.criado_em ||
                  null
              }

              const calculateSessionTime = (session) => {
                const startRaw =
                  session.data_login ||
                  session.criado_em ||
                  session.ultimo_refresh ||
                  new Date().toISOString()
                const start = new Date(startRaw)
                // Fim: data_logout (legado) ou expirado_em passado ou ultimo_refresh enquanto ativa
                let end
                if (session.data_logout) end = new Date(session.data_logout)
                else if (
                  session.expirado_em &&
                  new Date(session.expirado_em).getTime() < Date.now()
                )
                  end = new Date(session.expirado_em)
                else if (session.ultimo_refresh) end = new Date(session.ultimo_refresh)
                else end = new Date()
                const diffMs = end - start
                const hours = Math.floor(diffMs / (1000 * 60 * 60))
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                return `${hours}h ${minutes}m`
              }

              const totalTimeToday = todaySessions.reduce((acc, session) => {
                const start = new Date(
                  session.data_login || session.criado_em || session.ultimo_refresh || Date.now()
                )
                let end
                if (session.data_logout) end = new Date(session.data_logout)
                else if (
                  session.expirado_em &&
                  new Date(session.expirado_em).getTime() < Date.now()
                )
                  end = new Date(session.expirado_em)
                else if (session.ultimo_refresh) end = new Date(session.ultimo_refresh)
                else end = new Date()
                return acc + (end - start)
              }, 0)

              const userProposals = proposals.filter((p) => p.criado_por === user.id)

              return (
                <div key={user.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${currentSession ? 'bg-green-500' : 'bg-gray-300'}`}
                      ></div>
                      <div>
                        <h3 className="font-semibold">{user.nome}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant={user.tipo_usuario === 'gestor' ? 'default' : 'secondary'}>
                        {user.tipo_usuario}
                      </Badge>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-sm font-medium">
                        {currentSession ? 'Online' : 'Offline'}{' '}
                        <span className="text-xs text-muted-foreground">
                          (
                          {currentSession
                            ? `há ${formatAgo(lastActivity)}`
                            : `última há ${formatAgo(lastActivity)}`}
                          )
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tempo hoje: {Math.floor(totalTimeToday / (1000 * 60 * 60))}h{' '}
                        {Math.floor((totalTimeToday % (1000 * 60 * 60)) / (1000 * 60))}m
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Última Sessão</p>
                      {userSessions.length > 0 ? (
                        <div>
                          <p>
                            {(() => {
                              const last = userSessions[userSessions.length - 1]
                              const base = last.data_login || last.criado_em || last.ultimo_refresh
                              const d = base ? new Date(base) : null
                              return d && !isNaN(d) ? d.toLocaleString('pt-BR') : '—'
                            })()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Duração: {calculateSessionTime(userSessions[userSessions.length - 1])}
                          </p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground space-y-0.5">
                          <p>Nunca logou (sem registro em &apos;sessoes&apos;)</p>
                          {user.ultimo_refresh && (
                            <p className="text-xs">
                              Atividade recente:{' '}
                              {new Date(user.ultimo_refresh).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-medium text-muted-foreground">Propostas Criadas</p>
                      <p>{userProposals.length} total</p>
                      <p className="text-xs text-muted-foreground">
                        {userProposals.filter((p) => p.status === 'implantado').length} implantadas
                      </p>
                    </div>

                    <div>
                      <p className="font-medium text-muted-foreground">Performance</p>
                      <p>{userSessions.length} sessões totais</p>
                      <p className="text-xs text-muted-foreground">
                        {userProposals.length > 0
                          ? `${Math.round((userProposals.filter((p) => p.status === 'implantado').length / userProposals.length) * 100)}% conversão`
                          : 'Sem dados'}
                      </p>
                    </div>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-white hover:text-white/50">
                      Ver últimas 5 sessões
                    </summary>
                    <div className="mt-2 space-y-1">
                      {userSessions
                        .slice(-5)
                        .reverse()
                        .map((session) => (
                          <div key={session.id} className="text-xs bg-muted/50 p-2 rounded">
                            <div className="flex justify-between">
                              <span>
                                {(() => {
                                  const base =
                                    session.data_login ||
                                    session.criado_em ||
                                    session.ultimo_refresh
                                  const d = base ? new Date(base) : null
                                  return d && !isNaN(d) ? d.toLocaleString('pt-BR') : '—'
                                })()}
                              </span>
                              <span>
                                {session.data_logout
                                  ? new Date(session.data_logout).toLocaleString('pt-BR')
                                  : 'Em andamento'}
                              </span>
                              <span className="font-medium">{calculateSessionTime(session)}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </details>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Tempo de Implantação por Proposta</span>
          </CardTitle>
          <CardDescription>
            Análise detalhada do tempo desde criação até implantação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Consultor</TableHead>
                <TableHead>Analista</TableHead>
                <TableHead>Data Criação</TableHead>
                <TableHead>Status Atual</TableHead>
                <TableHead>Tempo Decorrido</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals
                .slice()
                .sort((a, b) => {
                  const ca = a?.codigo || ''
                  const cb = b?.codigo || ''
                  if (ca && cb)
                    return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: 'base' })
                  if (ca) return -1
                  if (cb) return 1
                  const da = a?.criado_em ? new Date(a.criado_em).getTime() : 0
                  const db = b?.criado_em ? new Date(b.criado_em).getTime() : 0
                  return da - db
                })
                .slice(0, 20)
                .map((proposal) => {
                  const createdDate = new Date(proposal.criado_em)
                  const currentDate = new Date()
                  const diffDays = Math.ceil((currentDate - createdDate) / (1000 * 60 * 60 * 24))
                  const diffHours = Math.ceil((currentDate - createdDate) / (1000 * 60 * 60))

                  return (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-mono text-sm">
                        {proposal.codigo ||
                          (proposal.id
                            ? `PRP${String(proposal.id).slice(0, 4).toUpperCase()}`
                            : '-')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCNPJ(proposal.cnpj)}
                      </TableCell>
                      <TableCell>{proposal.consultor}</TableCell>
                      <TableCell>{proposal.analista}</TableCell>
                      <TableCell>{createdDate.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeClasses(proposal.status)}>
                          {String(proposal.status || '')
                            .charAt(0)
                            .toUpperCase() + String(proposal.status || '').slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span
                            className={`font-medium ${proposal.status === 'implantado' ? 'text-green-600' : diffDays > 30 ? 'text-red-600' : diffDays > 15 ? 'text-yellow-600' : 'text-blue-600'}`}
                          >
                            {diffDays}d
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">({diffHours}h)</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(proposal.valor)}</TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
