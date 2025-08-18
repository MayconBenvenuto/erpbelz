'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { BarChart3, Users, Target, Clock, PlusCircle, LogOut, Building2, User, FileText, TrendingUp } from 'lucide-react'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('propostas')
  const [sessionId, setSessionId] = useState(null)
  
  // Login form state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  
  // Proposal form state
  const [proposalForm, setProposalForm] = useState({
    cnpj: '',
    consultor: '',
    operadora: '',
    quantidade_vidas: '',
    valor: '',
    previsao_implantacao: '',
    status: 'em análise'
  })
  
  // Data states
  const [proposals, setProposals] = useState([])
  const [users, setUsers] = useState([])
  const [userGoals, setUserGoals] = useState([])
  const [sessions, setSessions] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const operadoras = [
    'unimed recife', 'unimed seguros', 'bradesco', 'amil', 'ampla', 
    'fox', 'hapvida', 'medsenior', 'sulamerica', 'select'
  ]

  const statusOptions = [
    'em análise', 'pendencias seguradora', 'boleto liberado', 'implantando',
    'pendente cliente', 'pleito seguradora', 'negado', 'implantado'
  ]

  // Auth functions
  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setCurrentUser(result.user)
        setSessionId(result.sessionId)
        toast.success('Login realizado com sucesso!')
        loadData()
      } else {
        toast.error(result.error || 'Erro no login')
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (sessionId) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        })
      }
      
      setCurrentUser(null)
      setSessionId(null)
      toast.success('Logout realizado com sucesso!')
    } catch (error) {
      toast.error('Erro no logout')
    }
  }

  // Data loading functions
  const loadData = async () => {
    try {
      const [proposalsRes, usersRes, goalsRes, sessionsRes] = await Promise.all([
        fetch('/api/proposals'),
        fetch('/api/users'),
        fetch('/api/goals'),
        fetch('/api/sessions')
      ])

      if (proposalsRes.ok) setProposals(await proposalsRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (goalsRes.ok) setUserGoals(await goalsRes.json())
      if (sessionsRes.ok) setSessions(await sessionsRes.json())
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  // Proposal functions
  const handleCreateProposal = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate CNPJ first
      const cnpjResponse = await fetch('/api/validate-cnpj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: proposalForm.cnpj })
      })
      
      const cnpjResult = await cnpjResponse.json()
      
      if (!cnpjResult.valid) {
        toast.error(`CNPJ inválido: ${cnpjResult.error}`)
        setIsLoading(false)
        return
      }

      // Create proposal
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...proposalForm,
          criado_por: currentUser.id
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Proposta criada com sucesso!')
        setProposalForm({
          cnpj: '', consultor: '', operadora: '', quantidade_vidas: '',
          valor: '', previsao_implantacao: '', status: 'em análise'
        })
        setIsDialogOpen(false)
        loadData()
      } else {
        toast.error(result.error || 'Erro ao criar proposta')
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProposal = async (proposalId) => {
    if (currentUser?.tipo_usuario !== 'gestor') {
      toast.error('Apenas gestores podem excluir propostas')
      return
    }

    try {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Proposta excluída com sucesso!')
        loadData()
      } else {
        toast.error('Erro ao excluir proposta')
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor')
    }
  }

  const getStatusBadgeVariant = (status) => {
    const variants = {
      'em análise': 'secondary',
      'pendencias seguradora': 'outline',
      'boleto liberado': 'default',
      'implantando': 'secondary',
      'pendente cliente': 'outline',
      'pleito seguradora': 'destructive', 
      'negado': 'destructive',
      'implantado': 'default'
    }
    return variants[status] || 'secondary'
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatCNPJ = (cnpj) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  // Analytics data
  const totalProposals = proposals.length
  const implantedProposals = proposals.filter(p => p.status === 'implantado').length
  const totalValue = proposals.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0)
  const implantedValue = proposals.filter(p => p.status === 'implantado').reduce((sum, p) => sum + parseFloat(p.valor || 0), 0)

  // Login screen
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Toaster />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {/* Logo placeholder */}
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">CRM Propostas</CardTitle>
            <CardDescription>
              Faça login para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main application
  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo area */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">CRM Propostas</h1>
              <p className="text-sm text-muted-foreground">Sistema de Gestão</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{currentUser.nome}</span>
              <Badge variant={currentUser.tipo_usuario === 'gestor' ? 'default' : 'secondary'}>
                {currentUser.tipo_usuario}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="propostas" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Propostas
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            {currentUser.tipo_usuario === 'gestor' && (
              <>
                <TabsTrigger value="usuarios" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="relatorios" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Relatórios
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Proposals Tab */}
          <TabsContent value="propostas" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gerenciar Propostas</h2>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nova Proposta
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Criar Nova Proposta</DialogTitle>
                    <DialogDescription>
                      Preencha os dados da nova proposta. O CNPJ será validado automaticamente.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateProposal} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input
                          id="cnpj"
                          placeholder="00.000.000/0000-00"
                          value={proposalForm.cnpj}
                          onChange={(e) => setProposalForm(prev => ({ ...prev, cnpj: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="consultor">Consultor</Label>
                        <Input
                          id="consultor"
                          placeholder="Nome do consultor"
                          value={proposalForm.consultor}
                          onChange={(e) => setProposalForm(prev => ({ ...prev, consultor: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="operadora">Operadora</Label>
                        <Select
                          value={proposalForm.operadora}
                          onValueChange={(value) => setProposalForm(prev => ({ ...prev, operadora: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a operadora" />
                          </SelectTrigger>
                          <SelectContent>
                            {operadoras.map(op => (
                              <SelectItem key={op} value={op}>{op}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quantidade_vidas">Quantidade de Vidas</Label>
                        <Input
                          id="quantidade_vidas"
                          type="number"
                          placeholder="0"
                          value={proposalForm.quantidade_vidas}
                          onChange={(e) => setProposalForm(prev => ({ ...prev, quantidade_vidas: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="valor">Valor do Plano</Label>
                        <Input
                          id="valor"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={proposalForm.valor}
                          onChange={(e) => setProposalForm(prev => ({ ...prev, valor: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="previsao_implantacao">Previsão de Implantação</Label>
                        <Input
                          id="previsao_implantacao"
                          type="date"
                          value={proposalForm.previsao_implantacao}
                          onChange={(e) => setProposalForm(prev => ({ ...prev, previsao_implantacao: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={proposalForm.status}
                        onValueChange={(value) => setProposalForm(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Criando...' : 'Criar Proposta'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lista de Propostas</CardTitle>
                <CardDescription>
                  {proposals.length} proposta(s) cadastrada(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Consultor</TableHead>
                      <TableHead>Operadora</TableHead>
                      <TableHead>Vidas</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposals.map((proposal) => (
                      <TableRow key={proposal.id}>
                        <TableCell className="font-mono text-sm">
                          {formatCNPJ(proposal.cnpj)}
                        </TableCell>
                        <TableCell>{proposal.consultor}</TableCell>
                        <TableCell className="capitalize">{proposal.operadora}</TableCell>
                        <TableCell>{proposal.quantidade_vidas}</TableCell>
                        <TableCell>{formatCurrency(proposal.valor)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(proposal.status)}>
                            {proposal.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {currentUser.tipo_usuario === 'gestor' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteProposal(proposal.id)}
                            >
                              Excluir
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <h2 className="text-2xl font-bold">Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalProposals}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Propostas Implantadas</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{implantedProposals}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalProposals > 0 ? Math.round((implantedProposals / totalProposals) * 100) : 0}% de conversão
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Implantado</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(implantedValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalValue > 0 ? Math.round((implantedValue / totalValue) * 100) : 0}% do total
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* User Goals */}
            <Card>
              <CardHeader>
                <CardTitle>Minha Meta - 150k</CardTitle>
                <CardDescription>Progresso baseado em propostas implantadas</CardDescription>
              </CardHeader>
              <CardContent>
                {userGoals.map((goal) => {
                  if (goal.usuario_id === currentUser.id) {
                    const progress = (goal.valor_alcancado / goal.valor_meta) * 100
                    return (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progresso</span>
                          <span>{formatCurrency(goal.valor_alcancado)} / {formatCurrency(goal.valor_meta)}</span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-3" />
                        <p className="text-xs text-muted-foreground">
                          {progress >= 100 ? 'Meta atingida! 🎉' : `Faltam ${formatCurrency(goal.valor_meta - goal.valor_alcancado)} para atingir a meta`}
                        </p>
                      </div>
                    )
                  }
                  return null
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab (Gestor only) */}
          {currentUser.tipo_usuario === 'gestor' && (
            <TabsContent value="usuarios" className="space-y-6">
              <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Lista de Usuários</CardTitle>
                  <CardDescription>
                    {users.length} usuário(s) cadastrado(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Meta</TableHead>
                        <TableHead>Alcançado</TableHead>
                        <TableHead>Progresso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const userGoal = userGoals.find(g => g.usuario_id === user.id)
                        const progress = userGoal ? (userGoal.valor_alcancado / userGoal.valor_meta) * 100 : 0
                        
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.nome}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.tipo_usuario === 'gestor' ? 'default' : 'secondary'}>
                                {user.tipo_usuario}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {userGoal ? formatCurrency(userGoal.valor_meta) : '-'}
                            </TableCell>
                            <TableCell>
                              {userGoal ? formatCurrency(userGoal.valor_alcancado) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Progress value={Math.min(progress, 100)} className="h-2 w-20" />
                                <span className="text-xs">{Math.round(progress)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Reports Tab (Gestor only) */}
          {currentUser.tipo_usuario === 'gestor' && (
            <TabsContent value="relatorios" className="space-y-6">
              <h2 className="text-2xl font-bold">Relatórios de Sessão</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Monitoramento de Acesso</CardTitle>
                  <CardDescription>
                    Controle de tempo online e acessos dos usuários
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Data Login</TableHead>
                        <TableHead>Data Logout</TableHead>
                        <TableHead>Tempo Online</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => {
                        const user = users.find(u => u.id === session.usuario_id)
                        return (
                          <TableRow key={session.id}>
                            <TableCell>{user?.nome || 'Usuário não encontrado'}</TableCell>
                            <TableCell>
                              {new Date(session.data_login).toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              {session.data_logout 
                                ? new Date(session.data_logout).toLocaleString('pt-BR')
                                : 'Online'
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>{session.tempo_total || 'Em andamento'}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}