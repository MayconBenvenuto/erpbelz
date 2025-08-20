'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import Image from 'next/image'

// Seções
import Sidebar from '@/app/sections/Sidebar'
import Header from '@/app/sections/Header'
import ProposalsSection from '@/app/sections/Proposals'
import DashboardSection from '@/app/sections/Dashboard'
import UsersSection from '@/app/sections/Users'
import ReportsSection from '@/app/sections/Reports'
import MovimentacaoSection from '@/app/sections/Movimentacao'
import { OPERADORAS as operadoras, STATUS_OPTIONS as statusOptions } from '@/lib/constants'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('propostas')
  const [sessionId, setSessionId] = useState(null)
  const [_lastActivity, setLastActivity] = useState(Date.now())
  const [token, setToken] = useState(null)

  // Forms
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  // Dados
  const [proposals, setProposals] = useState([])
  const [users, setUsers] = useState([])
  const [userGoals, setUserGoals] = useState([])
  const [sessions, setSessions] = useState([])

  // Constantes importadas de lib/constants.js

  // Persistência de sessão no localStorage
  const saveSessionToStorage = (user, sessionId, tokenValue) => {
    localStorage.setItem('crm_user', JSON.stringify(user))
    localStorage.setItem('crm_session', sessionId)
    localStorage.setItem('crm_last_activity', Date.now().toString())
    if (tokenValue) localStorage.setItem('crm_token', tokenValue)
  }
  const clearSessionFromStorage = () => {
    localStorage.removeItem('crm_user')
    localStorage.removeItem('crm_session')
    localStorage.removeItem('crm_last_activity')
    localStorage.removeItem('crm_token')
  }
  const loadSessionFromStorage = () => {
    const user = localStorage.getItem('crm_user')
    const session = localStorage.getItem('crm_session')
    const lastActivity = localStorage.getItem('crm_last_activity')
    const savedToken = localStorage.getItem('crm_token')

    if (user && session && lastActivity && savedToken) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity)
      // Sessão válida por 24h
      if (timeSinceLastActivity < 24 * 60 * 60 * 1000) {
        setCurrentUser(JSON.parse(user))
        setSessionId(session)
        setLastActivity(parseInt(lastActivity))
        setToken(savedToken)
        return true
      }
    }
    return false
  }

  // Auth
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
  setToken(result.token)
  saveSessionToStorage(result.user, result.sessionId, result.token)
        toast.success('Login realizado com sucesso!')
      } else {
        toast.error(result.error || 'Erro no login')
      }
    } catch {
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
  setToken(null)
      clearSessionFromStorage()
      toast.success('Logout realizado com sucesso!')
    } catch {
      toast.error('Erro no logout')
    }
  }

  // Carregar dados
  const loadData = useCallback(async () => {
    try {
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      const [proposalsRes, usersRes, goalsRes, sessionsRes] = await Promise.all([
        fetch('/api/proposals', { headers: authHeaders }),
        fetch('/api/users', { headers: authHeaders }),
        fetch('/api/goals', { headers: authHeaders }),
        fetch('/api/sessions', { headers: authHeaders })
      ])
      if (proposalsRes.ok) setProposals(await proposalsRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (goalsRes.ok) setUserGoals(await goalsRes.json())
      if (sessionsRes.ok) setSessions(await sessionsRes.json())
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }, [token])

  // Handlers de propostas
  const handleCreateProposal = async (payload) => {
    setIsLoading(true)
    try {
      const { afterSuccess, cnpjValidationData: _ignore, ...body } = payload || {}
      // Segurança mínima: sanitizar email no cliente
      if (body.consultor_email) body.consultor_email = String(body.consultor_email).trim()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
      const result = await response.json()
      if (response.ok) {
        toast.success('Proposta criada com sucesso!')
        afterSuccess && afterSuccess()
        await loadData()
      } else {
        toast.error(result.error || 'Erro ao criar proposta')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setIsLoading(false)
    }
  }

  /*
  const handleDeleteProposal = async (proposalId) => {
    if (currentUser?.tipo_usuario !== 'gestor') {
      toast.error('Apenas gestores podem excluir propostas')
      return
    }
    try {
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch(`/api/proposals/${proposalId}`, { method: 'DELETE', headers })
      if (response.ok) {
        toast.success('Proposta excluída com sucesso!')
        await loadData()
      } else {
        toast.error('Erro ao excluir proposta')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    }
  }
  */

  const handleUpdateProposalStatus = async (proposalId, newStatus, proposal) => {
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus, criado_por: proposal.criado_por, valor: proposal.valor })
      })
      if (response.ok) {
        toast.success('Status da proposta atualizado com sucesso!')
        await loadData()
      } else {
        if (response.status === 403) {
          toast.error('Ação não permitida para esta proposta')
        } else {
          const result = await response.json().catch(() => ({}))
          toast.error(result.error || 'Erro ao atualizar status')
        }
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    }
  }

  // Handlers de usuários
  const handleCreateUser = async (payload) => {
    setIsLoading(true)
    try {
      const { afterSuccess, ...body } = payload || {}
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
      const result = await response.json()
      if (response.ok) {
        toast.success('Usuário criado com sucesso!')
        afterSuccess && afterSuccess()
        await loadData()
      } else {
        toast.error(result.error || 'Erro ao criar usuário')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto refresh e atividade
  const updateActivity = useCallback(() => {
    const now = Date.now()
    setLastActivity(now)
    if (currentUser) localStorage.setItem('crm_last_activity', now.toString())
  }, [currentUser])

  const autoRefreshData = useCallback(async () => {
    if (currentUser) await loadData()
  }, [currentUser, loadData])

  // Effects
  useEffect(() => {
    loadSessionFromStorage()
  }, [])

  useEffect(() => {
    if (currentUser) loadData()
  }, [currentUser, loadData])

  // Recarrega assim que o token estiver disponível após login
  useEffect(() => {
    if (currentUser && token) {
      loadData()
    }
  }, [currentUser, token, loadData])

  useEffect(() => {
    if (currentUser) {
      const interval = setInterval(autoRefreshData, 30000)
      return () => clearInterval(interval)
    }
  }, [currentUser, autoRefreshData])

  useEffect(() => {
    if (currentUser) {
      const handleActivity = () => updateActivity()
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
      events.forEach(event => document.addEventListener(event, handleActivity, true))
      return () => { events.forEach(event => document.removeEventListener(event, handleActivity, true)) }
    }
  }, [currentUser, updateActivity])

  useEffect(() => {
    if (currentUser && sessionId && token) saveSessionToStorage(currentUser, sessionId, token)
    else if (!currentUser) clearSessionFromStorage()
  }, [currentUser, sessionId, token])

  // Login
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
        <Toaster />
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Image src="/logo-belz.jpg" alt="Logo Belz" width={120} height={60} className="mx-auto rounded-lg" priority />
            </div>
            <CardTitle className="text-2xl text-primary font-montserrat">ADM Belz</CardTitle>
            <CardDescription>Faça login para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={loginForm.email} onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" placeholder="Sua senha" value={loginForm.password} onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Entrando...' : 'Entrar'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // App principal
  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <Sidebar currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} onRefresh={autoRefreshData} onLogout={handleLogout} />
      <div className="ml-64 min-h-screen flex flex-col">
        <Header activeTab={activeTab} currentUser={currentUser} />
        <main className="flex-1 p-6 overflow-auto">
          {/** Propostas visíveis conforme perfil: gestor vê todas; analista vê criadas por ele OU vinculadas ao seu email */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="propostas" className="space-y-6">
              {(() => {
                const proposalsForView = currentUser.tipo_usuario === 'gestor'
                  ? proposals
                  : proposals.filter(p => (
                      String(p.criado_por) === String(currentUser.id) ||
                      (p.consultor_email && String(p.consultor_email).toLowerCase() === String(currentUser.email || '').toLowerCase())
                    ))
        return (
                  <ProposalsSection
                    currentUser={currentUser}
                    proposals={proposalsForView}
                    operadoras={operadoras}
                    statusOptions={statusOptions}
                    onCreateProposal={handleCreateProposal}
                    onUpdateProposalStatus={handleUpdateProposalStatus}
                    isLoading={isLoading}
          users={users}
                    userGoals={userGoals}
                  />
                )
              })()}
            </TabsContent>

            <TabsContent value="dashboard" className="space-y-6">
              {(() => {
                const proposalsForView = currentUser.tipo_usuario === 'gestor'
                  ? proposals
                  : proposals.filter(p => (
                      String(p.criado_por) === String(currentUser.id) ||
                      (p.consultor_email && String(p.consultor_email).toLowerCase() === String(currentUser.email || '').toLowerCase())
                    ))
                return (
                  <DashboardSection
                    currentUser={currentUser}
                    proposals={proposalsForView}
                    users={users}
                    userGoals={userGoals}
                  />
                )
              })()}
            </TabsContent>

            {currentUser.tipo_usuario !== 'gestor' && (
              <TabsContent value="movimentacao" className="space-y-6">
                <MovimentacaoSection />
              </TabsContent>
            )}

            {currentUser.tipo_usuario === 'gestor' && (
              <TabsContent value="usuarios" className="space-y-6">
                <UsersSection users={users} proposals={proposals} userGoals={userGoals} onCreateUser={handleCreateUser} isLoading={isLoading} />
              </TabsContent>
            )}

            {currentUser.tipo_usuario === 'gestor' && (
              <TabsContent value="relatorios" className="space-y-6">
                <ReportsSection users={users} sessions={sessions} proposals={proposals} onRefresh={autoRefreshData} />
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>
    </div>
  )
}