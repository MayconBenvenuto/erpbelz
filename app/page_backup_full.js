'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { BarChart3, Users, Target, Clock, PlusCircle, LogOut, Building2, User, FileText, TrendingUp, RefreshCw } from 'lucide-react'
import Image from 'next/image'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('propostas')
  const [sessionId, setSessionId] = useState(null)
  const [lastActivity, setLastActivity] = useState(Date.now())
  
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

  // CNPJ validation result for displaying company data (gestor only)
  const [cnpjValidationResult, setCnpjValidationResult] = useState(null)
  
  // Data states
  const [proposals, setProposals] = useState([])
  const [users, setUsers] = useState([])
  const [userGoals, setUserGoals] = useState([])
  const [sessions, setSessions] = useState([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)

  const operadoras = [
    'unimed recife', 'unimed seguros', 'bradesco', 'amil', 'ampla', 
    'fox', 'hapvida', 'medsenior', 'sulamerica', 'select'
  ]

  const statusOptions = [
    'em análise', 'pendencias seguradora', 'boleto liberado', 'implantando',
    'pendente cliente', 'pleito seguradora', 'negado', 'implantado'
  ]

  // User creation form state
  const [userForm, setUserForm] = useState({
    nome: '',
    email: '',
    senha: '',
    tipo_usuario: 'analista'
  })

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
        setLastActivity(Date.now())
        saveSessionToStorage(result.user, result.sessionId)
        toast.success('Login realizado com sucesso!')
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
      setLastActivity(Date.now())
      clearSessionFromStorage()
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

      // Store CNPJ validation result for gestor to view
      if (currentUser.tipo_usuario === 'gestor') {
        setCnpjValidationResult(cnpjResult.data)
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
        setCnpjValidationResult(null)
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

  // User creation function (gestor only)
  const handleCreateUser = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Usuário criado com sucesso!')
        setUserForm({
          nome: '',
          email: '',
          senha: '',
          tipo_usuario: 'analista'
        })
        setIsUserDialogOpen(false)
        loadData()
      } else {
        toast.error(result.error || 'Erro ao criar usuário')
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateProposalStatus = async (proposalId, newStatus, proposal) => {
    try {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          criado_por: proposal.criado_por,
          valor: proposal.valor
        })
      })

      if (response.ok) {
        toast.success('Status da proposta atualizado com sucesso!')
        loadData()
      } else {
        const result = await response.json()
        toast.error(result.error || 'Erro ao atualizar status')
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

  // Função para persistir sessão no localStorage
  const saveSessionToStorage = (user, sessionId) => {
    localStorage.setItem('crm_user', JSON.stringify(user))
    localStorage.setItem('crm_session', sessionId)
    localStorage.setItem('crm_last_activity', Date.now().toString())
  }

  const clearSessionFromStorage = () => {
    localStorage.removeItem('crm_user')
    localStorage.removeItem('crm_session')
    localStorage.removeItem('crm_last_activity')
  }

  const loadSessionFromStorage = () => {
    const user = localStorage.getItem('crm_user')
    const session = localStorage.getItem('crm_session')
    const lastActivity = localStorage.getItem('crm_last_activity')
    
    if (user && session && lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity)
      // Session válida por 24 horas ao invés de 3 minutos
      if (timeSinceLastActivity < 24 * 60 * 60 * 1000) {
        setCurrentUser(JSON.parse(user))
        setSessionId(session)
        setLastActivity(parseInt(lastActivity))
        return true
      }
    }
    return false
  }

  // Update last activity
  const updateActivity = useCallback(() => {
    const now = Date.now()
    setLastActivity(now)
    if (currentUser) {
      localStorage.setItem('crm_last_activity', now.toString())
    }
  }, [currentUser])

  // Auto-refresh data callback
  const autoRefreshData = useCallback(async () => {
    if (currentUser) {
      await loadData()
    }
  }, [currentUser])

  // Effects
  useEffect(() => {
    // Tentar carregar sessão do localStorage na inicialização
    if (!currentUser) {
      loadSessionFromStorage()
    }
  }, [])

  useEffect(() => {
    // Carregar dados quando usuário faz login
    if (currentUser) {
      loadData()
    }
  }, [currentUser])

  useEffect(() => {
    // Auto-refresh dos dados a cada 30 segundos
    if (currentUser) {
      const interval = setInterval(autoRefreshData, 30000)
      return () => clearInterval(interval)
    }
  }, [currentUser, autoRefreshData])

  useEffect(() => {
    // Detectar atividade do usuário para manter sessão viva
    if (currentUser) {
      const handleActivity = () => updateActivity()
      
      // Eventos que indicam atividade
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
      events.forEach(event => {
        document.addEventListener(event, handleActivity, true)
      })

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleActivity, true)
        })
      }
    }
  }, [currentUser, updateActivity])

  useEffect(() => {
    // Salvar mudanças de usuário e sessão no localStorage
    if (currentUser && sessionId) {
      saveSessionToStorage(currentUser, sessionId)
    } else if (!currentUser) {
      clearSessionFromStorage()
    }
  }, [currentUser, sessionId])

  // Analytics data
  const totalProposals = proposals.length
  const implantedProposals = proposals.filter(p => p.status === 'implantado').length
  const totalValue = proposals.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0)
  const implantedValue = proposals.filter(p => p.status === 'implantado').reduce((sum, p) => sum + parseFloat(p.valor || 0), 0)

  // Login screen
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
        <Toaster />
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            {/* Logo da Belz */}
            <div className="mx-auto mb-4">
              <Image
                src="/logo-belz.jpg"
                alt="Logo Belz"
                width={120}
                height={60}
                className="mx-auto rounded-lg"
                priority
              />
            </div>
            <CardTitle className="text-2xl text-primary font-montserrat">CRM Belz</CardTitle>
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
    <div className="min-h-screen bg-background flex">
      <Toaster />
      
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r shadow-lg flex flex-col">
        {/* Logo area */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10">
              <Image
                src="/logo-belz.jpg"
                alt="Logo Belz"
                width={40}
                height={40}
                className="rounded-lg object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary font-montserrat">ADM Belz</h1>
              <p className="text-xs text-muted-foreground">Sistema de Propostas</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('propostas')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'propostas' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Propostas</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === 'dashboard' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>

            {currentUser.tipo_usuario === 'gestor' && (
              <>
                <button
                  onClick={() => setActiveTab('usuarios')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'usuarios' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Usuários</span>
                </button>

                <button
                  onClick={() => setActiveTab('relatorios')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'relatorios' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">Relatórios</span>
                </button>
              </>
            )}
          </div>
        </nav>

        {/* User info and logout */}
        <div className="p-4 border-t">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
            <User className="w-8 h-8 p-2 bg-primary/10 rounded-full text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser.nome}</p>
              <Badge variant={currentUser.tipo_usuario === 'gestor' ? 'default' : 'secondary'} className="text-xs">
                {currentUser.tipo_usuario}
              </Badge>
            </div>
          </div>
          
          <div className="mt-3 space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={autoRefreshData}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b bg-card shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {activeTab === 'propostas' && (currentUser.tipo_usuario === 'gestor' ? 'Monitorar Propostas' : 'Gerenciar Propostas')}
                  {activeTab === 'dashboard' && 'Dashboard'}
                  {activeTab === 'usuarios' && 'Gerenciar Usuários'}
                  {activeTab === 'relatorios' && 'Relatórios e Monitoramento'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTab === 'propostas' && (currentUser.tipo_usuario === 'gestor' 
                    ? 'Monitore e gerencie o status de todas as propostas' 
                    : 'Crie e visualize suas propostas')}
                  {activeTab === 'dashboard' && 'Visão geral das métricas e indicadores'}
                  {activeTab === 'usuarios' && 'Controle de usuários e permissões'}
                  {activeTab === 'relatorios' && 'Análise de sessões e atividades'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div style={{display: 'none'}}>
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
          </div>

          {/* Proposals Tab */}
          <TabsContent value="propostas" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  {currentUser.tipo_usuario === 'gestor' ? 'Monitorar Propostas' : 'Gerenciar Propostas'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentUser.tipo_usuario === 'gestor' 
                    ? 'Visualize e monitore todas as propostas do sistema' 
                    : 'Crie, edite e gerencie suas propostas'
                  }
                </p>
              </div>
              {currentUser.tipo_usuario !== 'gestor' && (
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

                    {/* CNPJ Company Data (Gestor only) */}
                    {currentUser.tipo_usuario === 'gestor' && cnpjValidationResult && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            Dados da Empresa
                            <Badge variant="outline" className="text-xs">
                              {cnpjValidationResult.source || 'API Externa'}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          {cnpjValidationResult.razao_social && (
                            <div>
                              <strong>Razão Social:</strong> {cnpjValidationResult.razao_social}
                            </div>
                          )}
                          {cnpjValidationResult.nome_fantasia && (
                            <div>
                              <strong>Nome Fantasia:</strong> {cnpjValidationResult.nome_fantasia}
                            </div>
                          )}
                          {cnpjValidationResult.descricao_situacao_cadastral && (
                            <div>
                              <strong>Situação:</strong> {cnpjValidationResult.descricao_situacao_cadastral}
                            </div>
                          )}
                          {cnpjValidationResult.cnae_fiscal_descricao && (
                            <div>
                              <strong>Atividade Principal:</strong> {cnpjValidationResult.cnae_fiscal_descricao}
                            </div>
                          )}
                          {(cnpjValidationResult.logradouro || cnpjValidationResult.municipio) && (
                            <div>
                              <strong>Endereço:</strong> {[
                                cnpjValidationResult.logradouro,
                                cnpjValidationResult.numero,
                                cnpjValidationResult.bairro,
                                cnpjValidationResult.municipio,
                                cnpjValidationResult.uf
                              ].filter(Boolean).join(', ')}
                              {cnpjValidationResult.cep && ` - CEP: ${cnpjValidationResult.cep}`}
                            </div>
                          )}
                          {cnpjValidationResult.telefone && (
                            <div>
                              <strong>Telefone:</strong> {cnpjValidationResult.telefone}
                            </div>
                          )}
                          {cnpjValidationResult.email && (
                            <div>
                              <strong>Email:</strong> {cnpjValidationResult.email}
                            </div>
                          )}
                          {cnpjValidationResult.capital_social && parseFloat(cnpjValidationResult.capital_social) > 0 && (
                            <div>
                              <strong>Capital Social:</strong> {formatCurrency(parseFloat(cnpjValidationResult.capital_social))}
                            </div>
                          )}
                          {cnpjValidationResult.note && (
                            <div className="text-amber-600 mt-2 p-2 bg-amber-50 rounded">
                              <strong>Aviso:</strong> {cnpjValidationResult.note}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

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
              )}
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
                      {currentUser.tipo_usuario === 'gestor' && <TableHead>Alterar Status</TableHead>}
                      {currentUser.tipo_usuario === 'gestor' && <TableHead>Ações</TableHead>}
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
                        {currentUser.tipo_usuario === 'gestor' && (
                          <TableCell>
                            <Select
                              value={proposal.status}
                              onValueChange={(newStatus) => handleUpdateProposalStatus(proposal.id, newStatus, proposal)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map(status => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                        {currentUser.tipo_usuario === 'gestor' && (
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteProposal(proposal.id)}
                            >
                              Excluir
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
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
                  <p className="text-xs text-muted-foreground">
                    Total no sistema
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Propostas Implantadas</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{implantedProposals}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalProposals > 0 ? Math.round((implantedProposals / totalProposals) * 100) : 0}% de conversão
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Pipeline completo
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-accent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Implantado</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent">{formatCurrency(implantedValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalValue > 0 ? Math.round((implantedValue / totalValue) * 100) : 0}% do total
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Dashboard adicional para gestores */}
            {currentUser.tipo_usuario === 'gestor' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Propostas por Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {['em análise', 'boleto liberado', 'implantando', 'pendente cliente', 'implantado', 'negado'].map((status) => {
                        const count = proposals.filter(p => p.status === status).length
                        const percentage = totalProposals > 0 ? (count / totalProposals) * 100 : 0
                        return (
                          <div key={status} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
                                {status}
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
                      {Object.entries(
                        proposals.reduce((acc, p) => {
                          acc[p.operadora] = (acc[p.operadora] || 0) + 1
                          return acc
                        }, {})
                      )
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
                      <div className="flex items-center justify-between">
                        <span>Total de Usuários</span>
                        <Badge variant="outline">{users.length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Gestores</span>
                        <Badge variant="default">{users.filter(u => u.tipo_usuario === 'gestor').length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Analistas</span>
                        <Badge variant="secondary">{users.filter(u => u.tipo_usuario === 'analista').length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Sessões Ativas</span>
                        <Badge variant="destructive">{sessions.filter(s => !s.data_logout).length}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

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
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Usuário</DialogTitle>
                      <DialogDescription>
                        Adicione um novo usuário analista ao sistema.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="user-nome">Nome Completo</Label>
                        <Input
                          id="user-nome"
                          placeholder="Nome do usuário"
                          value={userForm.nome}
                          onChange={(e) => setUserForm(prev => ({ ...prev, nome: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user-email">Email</Label>
                        <Input
                          id="user-email"
                          type="email"
                          placeholder="email@empresa.com"
                          value={userForm.email}
                          onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user-senha">Senha</Label>
                        <Input
                          id="user-senha"
                          type="password"
                          placeholder="Senha do usuário"
                          value={userForm.senha}
                          onChange={(e) => setUserForm(prev => ({ ...prev, senha: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user-tipo">Tipo de Usuário</Label>
                        <Select
                          value={userForm.tipo_usuario}
                          onValueChange={(value) => setUserForm(prev => ({ ...prev, tipo_usuario: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="analista">Analista</SelectItem>
                            <SelectItem value="gestor">Gestor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Criando...' : 'Criar Usuário'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
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
                        
                        // Calcular progresso baseado nas propostas implantadas do usuário
                        const userImplantedProposals = proposals.filter(p => 
                          p.criado_por === user.id && p.status === 'implantado'
                        )
                        const userImplantedValue = userImplantedProposals.reduce((sum, p) => 
                          sum + parseFloat(p.valor || 0), 0
                        )
                        
                        // Se há meta definida, usar a meta. Senão, calcular baseado em propostas
                        const targetValue = userGoal?.valor_meta || 100000 // Meta padrão de R$ 100k
                        const achievedValue = userGoal?.valor_alcancado || userImplantedValue
                        const progress = targetValue > 0 ? (achievedValue / targetValue) * 100 : 0
                        
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
                              {formatCurrency(targetValue)}
                              {!userGoal && (
                                <span className="text-xs text-muted-foreground block">
                                  (meta padrão)
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                {formatCurrency(achievedValue)}
                                <div className="text-xs text-muted-foreground">
                                  {userImplantedProposals.length} propostas implantadas
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Progress 
                                  value={Math.min(Math.max(progress, 0), 100)} 
                                  className="h-3 w-24 bg-secondary"
                                />
                                <span className={`text-sm font-medium ${
                                  progress >= 100 ? 'text-green-600' :
                                  progress >= 75 ? 'text-blue-600' :
                                  progress >= 50 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {Math.round(progress)}%
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Faltam {formatCurrency(Math.max(0, targetValue - achievedValue))}
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
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary">Relatórios e Monitoramento</h2>
                <Button variant="outline" size="sm" onClick={autoRefreshData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar Dados
                </Button>
              </div>

              {/* Estatísticas gerais de acesso */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Usuários Online</p>
                        <p className="text-2xl font-bold text-green-600">
                          {sessions.filter(s => !s.data_logout).length}
                        </p>
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
                        <p className="text-2xl font-bold text-blue-600">
                          {sessions.filter(s => 
                            new Date(s.data_login).toDateString() === new Date().toDateString()
                          ).length}
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
                          {proposals.filter(p => 
                            new Date(p.criado_em).toDateString() === new Date().toDateString()
                          ).length}
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
                            const implantedProps = proposals.filter(p => p.status === 'implantado' && p.criado_em)
                            if (implantedProps.length === 0) return '0d'
                            
                            const avgDays = implantedProps.reduce((acc, p) => {
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

              {/* Monitoramento detalhado de acesso */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Monitoramento Detalhado de Acesso</span>
                  </CardTitle>
                  <CardDescription>
                    Controle completo de sessões e atividades dos usuários
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.map((user) => {
                      const userSessions = sessions.filter(s => s.usuario_id === user.id)
                      const currentSession = userSessions.find(s => !s.data_logout)
                      const todaySessions = userSessions.filter(s => 
                        new Date(s.data_login).toDateString() === new Date().toDateString()
                      )
                      
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
                              <Badge variant={user.tipo_usuario === 'gestor' ? 'default' : 'secondary'}>
                                {user.tipo_usuario}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {currentSession ? 'Online' : 'Offline'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Tempo hoje: {Math.floor(totalTimeToday / (1000 * 60 * 60))}h {Math.floor((totalTimeToday % (1000 * 60 * 60)) / (1000 * 60))}m
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-muted-foreground">Última Sessão</p>
                              {userSessions.length > 0 ? (
                                <div>
                                  <p>{new Date(userSessions[userSessions.length - 1].data_login).toLocaleString('pt-BR')}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Duração: {calculateSessionTime(userSessions[userSessions.length - 1])}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-muted-foreground">Nunca logou</p>
                              )}
                            </div>
                            
                            <div>
                              <p className="font-medium text-muted-foreground">Propostas Criadas</p>
                              <p>{userProposals.length} total</p>
                              <p className="text-xs text-muted-foreground">
                                {userProposals.filter(p => p.status === 'implantado').length} implantadas
                              </p>
                            </div>

                            <div>
                              <p className="font-medium text-muted-foreground">Performance</p>
                              <p>{userSessions.length} sessões totais</p>
                              <p className="text-xs text-muted-foreground">
                                {userProposals.length > 0 ? 
                                  `${Math.round((userProposals.filter(p => p.status === 'implantado').length / userProposals.length) * 100)}% conversão` 
                                  : 'Sem dados'
                                }
                              </p>
                            </div>
                          </div>

                          {/* Histórico de sessões recentes */}
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80">
                              Ver últimas 5 sessões
                            </summary>
                            <div className="mt-2 space-y-1">
                              {userSessions.slice(-5).reverse().map((session, index) => (
                                <div key={session.id} className="text-xs bg-muted/50 p-2 rounded">
                                  <div className="flex justify-between">
                                    <span>
                                      {new Date(session.data_login).toLocaleString('pt-BR')}
                                    </span>
                                    <span>
                                      {session.data_logout ? 
                                        new Date(session.data_logout).toLocaleString('pt-BR') : 
                                        'Em andamento'
                                      }
                                    </span>
                                    <span className="font-medium">
                                      {calculateSessionTime(session)}
                                    </span>
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

              {/* Análise de tempo de implantação por proposta */}
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
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Consultor</TableHead>
                        <TableHead>Data Criação</TableHead>
                        <TableHead>Status Atual</TableHead>
                        <TableHead>Tempo Decorrido</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proposals
                        .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
                        .slice(0, 20)
                        .map((proposal) => {
                          const createdDate = new Date(proposal.criado_em)
                          const currentDate = new Date()
                          const diffDays = Math.ceil((currentDate - createdDate) / (1000 * 60 * 60 * 24))
                          const diffHours = Math.ceil((currentDate - createdDate) / (1000 * 60 * 60))
                          
                          return (
                            <TableRow key={proposal.id}>
                              <TableCell className="font-mono text-sm">
                                {formatCNPJ(proposal.cnpj)}
                              </TableCell>
                              <TableCell>{proposal.consultor}</TableCell>
                              <TableCell>
                                {createdDate.toLocaleString('pt-BR')}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(proposal.status)}>
                                  {proposal.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <span className={`font-medium ${
                                    proposal.status === 'implantado' ? 'text-green-600' :
                                    diffDays > 30 ? 'text-red-600' :
                                    diffDays > 15 ? 'text-yellow-600' : 'text-blue-600'
                                  }`}>
                                    {diffDays}d
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({diffHours}h)
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {formatCurrency(proposal.valor)}
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
    </div>
  )
}