'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Clock, TrendingUp, RefreshCw, Target } from 'lucide-react'
import { formatCurrency, formatCNPJ, getStatusBadgeClasses } from '@/lib/utils'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts'

export default function ReportsSection({ users, sessions, proposals, onRefresh, currentUser, token }) {
  const [refreshing, setRefreshing] = useState(false)
  const [perf, setPerf] = useState(null)
  const [loadingPerf, setLoadingPerf] = useState(false)
  const [start, setStart] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10))
  const [end, setEnd] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).toISOString().slice(0,10))
  // Filtrar gestores do monitoramento
  const analystUsers = Array.isArray(users) ? users.filter(u => u.tipo_usuario !== 'gestor') : []
  const analystIds = new Set(analystUsers.map(u => u.id))
  const filteredSessions = Array.isArray(sessions) ? sessions.filter(s => analystIds.has(s.usuario_id)) : []
  const filteredProposals = Array.isArray(proposals) ? proposals.filter(p => analystIds.has(p.criado_por)) : []
  const now = Date.now()
  const isSessionActive = (s) => !s.data_logout && (!s.ultimo_ping || (now - new Date(s.ultimo_ping).getTime()) < 5 * 60 * 1000)

  const loadPerformance = async () => {
    if (currentUser?.tipo_usuario !== 'gestor') return
    setLoadingPerf(true)
    try {
      const res = await fetch(`/api/reports/performance?start=${start}&end=${end}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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

          {perf && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Painel de Desempenho</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                  <Card className="col-span-1">
                    <CardHeader><CardTitle>KPIs</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between"><span>Total propostas</span><strong>{perf.kpis?.total_propostas ?? 0}</strong></div>
                      <div className="flex justify-between"><span>Implantadas</span><strong>{perf.kpis?.implantadas ?? 0}</strong></div>
                      <div className="flex justify-between"><span>Ticket médio</span><strong>R$ {Number(perf.kpis?.ticket_medio_geral ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                      <div className="flex justify-between"><span>Vidas</span><strong>{perf.kpis?.vidas_totais ?? 0}</strong></div>
                    </CardContent>
                  </Card>

                  <Card className="xl:col-span-1">
                    <CardHeader><CardTitle>Funil por Status</CardTitle></CardHeader>
                    <CardContent className="h-64">
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

                  <Card className="xl:col-span-1">
                    <CardHeader><CardTitle>Vidas por Operadora</CardTitle></CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perf.vidasPorOperadora || []}>
                          <XAxis dataKey="operadora" hide />
                          <YAxis hide />
                          <Tooltip />
                          <Bar dataKey="vidas_total" fill="#021d79" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="xl:col-span-1">
                    <CardHeader><CardTitle>Ticket Médio (implantadas)</CardTitle></CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{ name: 'Ticket', value: Number(perf.kpis?.ticket_medio_geral || 0) }]} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                            <Cell fill="#6b7cff" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Ranking por Analista</CardTitle></CardHeader>
                <CardContent className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Analista</TableHead>
                        <TableHead>Propostas</TableHead>
                        <TableHead>Implantadas</TableHead>
                        <TableHead>Ticket Médio</TableHead>
                        <TableHead>Vidas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(perf.rankingAnalistas || []).map((r) => (
                        <TableRow key={r.usuario_id || r.nome}>
                          <TableCell>{r.nome}</TableCell>
                          <TableCell>{r.total_propostas}</TableCell>
                          <TableCell>{r.implantadas} ({r.taxa_implantacao}%)</TableCell>
                          <TableCell>R$ {Number(r.ticket_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>{r.vidas_total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Ranking por Consultor</CardTitle></CardHeader>
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
                          <TableCell>{r.implantadas} ({r.taxa_implantacao}%)</TableCell>
                          <TableCell>R$ {Number(r.ticket_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>{r.vidas_total}</TableCell>
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
        <h2 className="text-2xl font-bold text-primary">Relatórios e Monitoramento</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => { try { setRefreshing(true); await onRefresh?.() } finally { setRefreshing(false) } }}
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
                <p className="text-2xl font-bold text-green-600">{filteredSessions.filter(s => isSessionActive(s)).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Sessões Hoje</p>
                <p className="text-2xl font-bold text-blue-600">{filteredSessions.filter(s => new Date(s.data_login).toDateString() === new Date().toDateString()).length}</p>
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
                <p className="text-2xl font-bold text-yellow-600">{filteredProposals.filter(p => new Date(p.criado_em).toDateString() === new Date().toDateString()).length}</p>
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
                <p className="text-2xl font-bold text-purple-600">{(() => {
                  const implantedProps = proposals.filter(p => p.status === 'implantado' && p.criado_em)
                  if (implantedProps.length === 0) return '0d'
                  const avgDays = implantedProps.reduce((acc, p) => {
                    const created = new Date(p.criado_em)
                    const implanted = new Date(p.atualizado_em || p.criado_em)
                    const diffDays = Math.ceil((implanted - created) / (1000 * 60 * 60 * 24))
                    return acc + diffDays
                  }, 0) / implantedProps.length
                  return Math.round(avgDays) + 'd'
                })()}</p>
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
            {analystUsers.map((user) => {
              const userSessions = sessions.filter(s => s.usuario_id === user.id)
              const currentSession = userSessions.find(s => isSessionActive(s))
              const todaySessions = userSessions.filter(s => new Date(s.data_login).toDateString() === new Date().toDateString())

              const calculateSessionTime = (session) => {
                const start = new Date(session.data_login)
                const end = session.data_logout ? new Date(session.data_logout) : new Date()
                const diffMs = end - start
                const hours = Math.floor(diffMs / (1000 * 60 * 60))
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                return `${hours}h ${minutes}m`
              }

              const totalTimeToday = todaySessions.reduce((acc, session) => {
                const start = new Date(session.data_login)
                const end = session.data_logout ? new Date(session.data_logout) : new Date()
                return acc + (end - start)
              }, 0)

              const userProposals = proposals.filter(p => p.criado_por === user.id)

              return (
                <div key={user.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${currentSession ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div>
                        <h3 className="font-semibold">{user.nome}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant={user.tipo_usuario === 'gestor' ? 'default' : 'secondary'}>{user.tipo_usuario}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{currentSession ? 'Online' : 'Offline'}</p>
                      <p className="text-xs text-muted-foreground">Tempo hoje: {Math.floor(totalTimeToday / (1000 * 60 * 60))}h {Math.floor((totalTimeToday % (1000 * 60 * 60)) / (1000 * 60))}m</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Última Sessão</p>
                      {userSessions.length > 0 ? (
                        <div>
                          <p>{new Date(userSessions[userSessions.length - 1].data_login).toLocaleString('pt-BR')}</p>
                          <p className="text-xs text-muted-foreground">Duração: {calculateSessionTime(userSessions[userSessions.length - 1])}</p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Nunca logou</p>
                      )}
                    </div>

                    <div>
                      <p className="font-medium text-muted-foreground">Propostas Criadas</p>
                      <p>{userProposals.length} total</p>
                      <p className="text-xs text-muted-foreground">{userProposals.filter(p => p.status === 'implantado').length} implantadas</p>
                    </div>

                    <div>
                      <p className="font-medium text-muted-foreground">Performance</p>
                      <p>{userSessions.length} sessões totais</p>
                      <p className="text-xs text-muted-foreground">{userProposals.length > 0 ? `${Math.round((userProposals.filter(p => p.status === 'implantado').length / userProposals.length) * 100)}% conversão` : 'Sem dados'}</p>
                    </div>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80">Ver últimas 5 sessões</summary>
                    <div className="mt-2 space-y-1">
                      {userSessions.slice(-5).reverse().map((session) => (
                        <div key={session.id} className="text-xs bg-muted/50 p-2 rounded">
                          <div className="flex justify-between">
                            <span>{new Date(session.data_login).toLocaleString('pt-BR')}</span>
                            <span>{session.data_logout ? new Date(session.data_logout).toLocaleString('pt-BR') : 'Em andamento'}</span>
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
          <CardDescription>Análise detalhada do tempo desde criação até implantação</CardDescription>
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
                  if (ca && cb) return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: 'base' })
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
                      <TableCell className="font-mono text-sm">{proposal.codigo || (proposal.id ? `PRP${String(proposal.id).slice(0,4).toUpperCase()}` : '-')}</TableCell>
                      <TableCell className="font-mono text-sm">{formatCNPJ(proposal.cnpj)}</TableCell>
                      <TableCell>{proposal.consultor}</TableCell>
                      <TableCell>{proposal.analista}</TableCell>
                      <TableCell>{createdDate.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeClasses(proposal.status)}>
                          {String(proposal.status || '').charAt(0).toUpperCase() + String(proposal.status || '').slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className={`font-medium ${proposal.status === 'implantado' ? 'text-green-600' : diffDays > 30 ? 'text-red-600' : diffDays > 15 ? 'text-yellow-600' : 'text-blue-600'}`}>{diffDays}d</span>
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
