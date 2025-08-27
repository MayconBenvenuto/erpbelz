'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import MobileSidebar from '@/app/sections/MobileSidebar'
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

  // Persistência de sessão no sessionStorage (sessão do navegador, não persiste após fechar)
  const saveSessionToStorage = (user, sessionId, tokenValue) => {
    try {
      sessionStorage.setItem('crm_user', JSON.stringify(user))
      sessionStorage.setItem('crm_session', sessionId)
      sessionStorage.setItem('crm_last_activity', Date.now().toString())
  if (tokenValue) sessionStorage.setItem('crm_token', tokenValue)
    } catch (_) {
      // ignore quota or storage errors
    }
  }
  const clearSessionFromStorage = () => {
    try {
      sessionStorage.removeItem('crm_user')
      sessionStorage.removeItem('crm_session')
      sessionStorage.removeItem('crm_last_activity')
      sessionStorage.removeItem('crm_token')
    } catch (_) {
      // ignore
    }
  }
  const loadSessionFromStorage = () => {
    try {
      const user = sessionStorage.getItem('crm_user')
      const session = sessionStorage.getItem('crm_session')
      const lastActivity = sessionStorage.getItem('crm_last_activity')
    const savedToken = sessionStorage.getItem('crm_token')
    // aceita sessão baseada em cookie (sem token salvo no storage)
    if (user && session && lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity)
        // Sessão válida por 24h (apenas enquanto o navegador estiver aberto)
        if (timeSinceLastActivity < 24 * 60 * 60 * 1000) {
          setCurrentUser(JSON.parse(user))
          setSessionId(session)
          setLastActivity(parseInt(lastActivity))
      if (savedToken) setToken(savedToken)
          return true
        }
      }
    } catch (_) {
      // ignore
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
        credentials: 'include',
        body: JSON.stringify(loginForm)
      })
      const result = await response.json()
      if (response.ok) {
        setCurrentUser(result.user)
        setSessionId(result.sessionId)
  setLastActivity(Date.now())
  setToken(result.token)
  saveSessionToStorage(result.user, result.sessionId, result.token)
  if (result.user?.tipo_usuario === 'consultor') setActiveTab('propostas')
  else if (result.user?.tipo_usuario === 'gestor') setActiveTab('dashboard')
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
          credentials: 'include',
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
  // Consultor agora também carrega propostas (mas não goals e sessions administrativos)
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      const common = { credentials: 'include' }
      const fetches = []
      // Propostas: gestor e analista usam
      fetches.push(fetch('/api/proposals', { headers: authHeaders, ...common }))
      // Users e Sessions: apenas gestor precisa
      const needsAdminData = currentUser?.tipo_usuario === 'gestor'
      if (needsAdminData) fetches.push(fetch('/api/users', { headers: authHeaders, ...common }))
  // Metas: agora também para consultor (exibe progresso pessoal)
	const needsGoals = true
  if (needsGoals) fetches.push(fetch('/api/goals', { headers: authHeaders, ...common }))
      if (needsAdminData) fetches.push(fetch('/api/sessions', { headers: authHeaders, ...common }))

  const responses = await Promise.all(fetches)
      let idx = 0
      const proposalsRes = responses[idx++]
      if (proposalsRes?.ok) setProposals(await proposalsRes.json())
      if (needsAdminData) {
        const usersRes = responses[idx++]
        if (usersRes?.ok) setUsers(await usersRes.json())
      }
      if (needsGoals) {
        const goalsRes = responses[idx++]
        if (goalsRes?.ok) setUserGoals(await goalsRes.json())
      }
      if (needsAdminData) {
        const sessionsRes = responses[idx++]
        if (sessionsRes?.ok) setSessions(await sessionsRes.json())
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }, [token, currentUser?.tipo_usuario])

  // Debounce simples para evitar múltiplos loadData encadeados (ex: criar + atualizar status)
  const loadDataDebouncedRef = useRef({ timer: null, pending: false })
  const scheduleLoadData = useCallback((immediate = false) => {
    const ref = loadDataDebouncedRef.current
    if (immediate) {
      if (ref.timer) { clearTimeout(ref.timer); ref.timer = null }
      loadData()
      return
    }
    ref.pending = true
    if (ref.timer) return
    ref.timer = setTimeout(() => {
      ref.timer = null
      if (ref.pending) {
        ref.pending = false
        loadData()
      }
    }, 250)
  }, [loadData])

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
        credentials: 'include',
        body: JSON.stringify(body)
      })
      const result = await response.json()
      if (response.ok) {
        toast.success('Proposta criada com sucesso!')
        afterSuccess && afterSuccess()
        // Otimista: insere nova proposta imediatamente sem esperar round-trip completo
        if (result && result.id) {
          setProposals(prev => {
            // evita duplicar se já vier do SSE
            if (prev.some(p => p.id === result.id)) return prev
            return [...prev, result]
          })
        }
        scheduleLoadData()
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

  const handleUpdateProposalStatus = async (proposalId, newStatus) => {
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const payload = { status: String(newStatus).trim().toLowerCase() }
      const doPatch = () => fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      // Otimista: aplica status local enquanto requisita
      setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: payload.status } : p))
      let response = await doPatch()
      if (!response.ok && response.status === 404) {
        // pequena espera para caso de claim implícito
        await new Promise(r => setTimeout(r, 180))
        const retry = await doPatch()
        if (retry.ok) response = retry
      }
      if (response.ok) {
        toast.success('Status da proposta atualizado com sucesso!')
        scheduleLoadData()
        return
      }
      if (response.status === 404) {
        const result = await response.json().catch(() => ({}))
        toast.error(result.error || 'Proposta não encontrada. Recarregando...')
        scheduleLoadData(true)
        return
      }
      if (response.status === 403) {
        toast.error('Ação não permitida (verifique se você assumiu a proposta)')
        // Reverte otimista se proibido
        scheduleLoadData(true)
        return
      }
      const result = await response.json().catch(() => ({}))
      toast.error(result.error || 'Erro ao atualizar status')
      scheduleLoadData()
    } catch {
      toast.error('Erro ao conectar com o servidor')
      scheduleLoadData()
    }
  }

  const handlePatchProposal = async (proposalId, payload) => {
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        toast.success('Proposta atualizada com sucesso!')
        // Atualização otimista básica (merge campos conhecidos)
        setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, ...payload } : p))
        scheduleLoadData()
        return { ok: true }
      } else {
        const result = await response.json().catch(() => ({}))
        toast.error(result.error || 'Erro ao atualizar proposta')
        scheduleLoadData()
        return { ok: false, error: result.error }
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
      scheduleLoadData()
      return { ok: false, error: 'network' }
    }
  }

  // SSE incremental (se disponível) para reduzir full reload
  useEffect(() => {
    if (!currentUser) return
    let es
    try {
      es = new EventSource('/api/proposals/events')
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg?.type === 'proposal_updated' && msg?.data?.id) {
            setProposals(prev => {
              const exists = prev.some(p => p.id === msg.data.id)
              return exists ? prev.map(p => p.id === msg.data.id ? { ...p, ...msg.data } : p) : [...prev, msg.data]
            })
          }
        } catch (_) {}
      }
      es.onerror = () => {
        try { es.close() } catch {}
      }
    } catch {}
    return () => { try { es && es.close() } catch {} }
  }, [currentUser])

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
        credentials: 'include',
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

  const handleUpdateUserGoal = async (usuarioId, valorMeta, valorAlcancado) => {
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch('/api/goals', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ usuario_id: usuarioId, valor_meta: valorMeta, ...(typeof valorAlcancado === 'number' ? { valor_alcancado: valorAlcancado } : {}) })
      })
      if (response.ok) {
        toast.success('Meta atualizada')
        await loadData()
        return { ok: true }
      }
      const result = await response.json().catch(() => ({}))
      toast.error(result.error || 'Erro ao atualizar meta')
      return { ok: false, error: result.error }
    } catch {
      toast.error('Erro ao conectar com o servidor')
      return { ok: false, error: 'network' }
    }
  }

  // Auto refresh e atividade
  const updateActivity = useCallback(() => {
    const now = Date.now()
    setLastActivity(now)
    if (currentUser) {
      try { sessionStorage.setItem('crm_last_activity', now.toString()) } catch (_) {}
    }
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

  // Renovar token se usuário autenticado via cookie e token ausente
  useEffect(() => {
    if (currentUser && !token) {
      ;(async () => {
        try {
          const res = await fetch('/api/auth/renew', { method: 'GET', credentials: 'include' })
          if (res.ok) {
            const data = await res.json()
            if (data.token) setToken(data.token)
          }
        } catch {}
      })()
    }
  }, [currentUser, token])

  // Consultor: pode acessar Movimentação e Implantação; redireciona somente se cair em abas proibidas
  // Removido redirecionamento restritivo: consultor pode acessar Propostas agora

  // Recarrega assim que o token estiver disponível após login
  useEffect(() => {
    if (currentUser && token) {
      loadData()
    }
  }, [currentUser, token, loadData])

  useEffect(() => {
    if (currentUser) {
      const interval = setInterval(autoRefreshData, 30000)
      // também envia ping de sessão para melhorar precisão do status online
      const ping = async () => {
        try {
          if (!sessionId) return
          const headers = { 'Content-Type': 'application/json' }
          if (token) headers['Authorization'] = `Bearer ${token}`
          await fetch('/api/sessions/ping', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ sessionId })
          })
        } catch {}
      }
      const pingInterval = setInterval(ping, 60000)
      ping()
      return () => { clearInterval(interval); clearInterval(pingInterval) }
    }
  }, [currentUser, autoRefreshData, sessionId, token])

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

  // Sem logout automático no pagehide/beforeunload para preservar sessão em reload.

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
            <CardTitle className="text-2xl text-primary font-montserrat">Sistema de Gestão - Belz</CardTitle>
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
      <div className="md:ml-64 min-h-screen flex flex-col">
  <Header
          activeTab={activeTab}
          currentUser={currentUser}
          leftSlot={<div className="md:hidden"><MobileSidebar currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} onRefresh={autoRefreshData} onLogout={handleLogout} /></div>}
        />
  <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          {/** Para consultor: restringe Propostas/Dashboard */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {true && (
            <TabsContent value="propostas" className="space-y-6">
              {(() => {
                const proposalsForView = currentUser.tipo_usuario === 'gestor'
                  ? proposals
                  : currentUser.tipo_usuario === 'consultor'
                    ? proposals.filter(p => (
                        String(p.criado_por) === String(currentUser.id) ||
                        (p.consultor_email && String(p.consultor_email).toLowerCase() === String(currentUser.email || '').toLowerCase())
                      ))
                    : proposals.filter(p => (
                        // Analista: vê as que criou, as que assumiu ou ainda não atribuídas (para poder assumir)
                        String(p.criado_por) === String(currentUser.id) ||
                        String(p.atendido_por) === String(currentUser.id) ||
                        !p.atendido_por
                      ))
        return (
                  <ProposalsSection
                    currentUser={currentUser}
                    proposals={proposalsForView}
                    operadoras={operadoras}
                    statusOptions={statusOptions}
                    onCreateProposal={handleCreateProposal}
                    onUpdateProposalStatus={handleUpdateProposalStatus}
                    onPatchProposal={handlePatchProposal}
                    isLoading={isLoading}
          users={users}
                    userGoals={userGoals}
                  />
                )
              })()}
            </TabsContent>
            )}

            {true && (
              <TabsContent value="dashboard" className="space-y-6">
                {(() => {
                  const proposalsForView = currentUser.tipo_usuario === 'gestor'
                    ? proposals
                    : currentUser.tipo_usuario === 'consultor'
                      ? proposals.filter(p => (
                          String(p.criado_por) === String(currentUser.id) ||
                          (p.consultor_email && String(p.consultor_email).toLowerCase() === String(currentUser.email || '').toLowerCase())
                        ))
                      : proposals.filter(p => (
                          String(p.criado_por) === String(currentUser.id) ||
                          String(p.atendido_por) === String(currentUser.id) ||
                          !p.atendido_por
                        ))

                  if (currentUser.tipo_usuario === 'consultor') {
                    const ConsultorDashboardSection = require('./sections/ConsultorDashboard.jsx').default
                    return <ConsultorDashboardSection currentUser={currentUser} proposals={proposalsForView} userGoals={userGoals} />
                  }
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
            )}

            {(currentUser.tipo_usuario === 'analista' || currentUser.tipo_usuario === 'consultor' || currentUser.tipo_usuario === 'gestor') && (
              <TabsContent value="movimentacao" className="space-y-6">
                <MovimentacaoSection currentUser={currentUser} token={token} />
              </TabsContent>
            )}

            {currentUser.tipo_usuario === 'gestor' && (
              <TabsContent value="usuarios" className="space-y-6">
                <UsersSection currentUser={currentUser} users={users} proposals={proposals} userGoals={userGoals} onCreateUser={handleCreateUser} onUpdateUserGoal={handleUpdateUserGoal} isLoading={isLoading} />
              </TabsContent>
            )}

            {currentUser.tipo_usuario === 'gestor' && (
              <TabsContent value="relatorios" className="space-y-6">
                <ReportsSection users={users} sessions={sessions} proposals={proposals} onRefresh={autoRefreshData} />
              </TabsContent>
            )}

            {/* Seção Implantação removida */}
          </Tabs>
        </main>
      </div>
    </div>
  )
}