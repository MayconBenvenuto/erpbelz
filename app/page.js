'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import Image from 'next/image'

// Performance providers
import { QueryProvider } from '@/components/query-provider'
import { useServiceWorker } from '@/hooks/use-service-worker'

// Lazy loaded sections (otimizadas)
import {
  LazyProposalsSection,
  LazyReportsSection,
  LazyMovimentacaoSection,
  LazyUsersSection,
  DashboardSection,
  Sidebar,
  Header,
  EmDesenvolvimento,
} from '@/components/lazy-sections'

import TopUserActions from '@/components/TopUserActions'
import MobileSidebar from '@/app/sections/MobileSidebar'
import { OPERADORAS as operadoras, STATUS_OPTIONS as statusOptions } from '@/lib/constants'
// Import necessário para operações otimistas de propostas (antes faltava causando possíveis erros)
import { queryClient, queryKeys } from '@/lib/query-client'
import { useProposals } from '@/hooks/use-api'
import { hasPermission } from '@/lib/rbac'
import { Search } from 'lucide-react'
import CommandPalette from './components/CommandPalette'

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sessionId, setSessionId] = useState(null)
  const [_lastActivity, setLastActivity] = useState(Date.now())
  const [token, setToken] = useState(null)

  // Forms
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  // Fluxo esqueci a senha (mantido mesmo quando user loga, não renderiza)
  const [forgotStep, setForgotStep] = useState('login') // login | email | code | reset | done
  const [fpEmail, setFpEmail] = useState('')
  const [fpCode, setFpCode] = useState('')
  const [fpResetToken, setFpResetToken] = useState('')
  const [fpNewPass, setFpNewPass] = useState('')
  const [fpNewPass2, setFpNewPass2] = useState('')
  const [fpLoading, setFpLoading] = useState(false)

  // Funções fluxo esqueci a senha
  const requestCode = async (e) => {
    e.preventDefault()
    setFpLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Erro ao solicitar código')
        return
      }
      toast.success('Se o email existir, código enviado')
      setForgotStep('code')
    } catch {
      toast.error('Erro de rede')
    } finally {
      setFpLoading(false)
    }
  }
  const verifyCode = async (e) => {
    e.preventDefault()
    setFpLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, code: fpCode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Código inválido')
        return
      }
      setFpResetToken(data.resetToken)
      toast.success('Código verificado')
      setForgotStep('reset')
    } catch {
      toast.error('Erro de rede')
    } finally {
      setFpLoading(false)
    }
  }
  const submitReset = async (e) => {
    e.preventDefault()
    if (fpNewPass !== fpNewPass2) {
      toast.error('Senhas não coincidem')
      return
    }
    setFpLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fpEmail,
          code: fpCode,
          resetToken: fpResetToken,
          novaSenha: fpNewPass,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Falha ao redefinir')
        return
      }
      toast.success('Senha redefinida. Faça login.')
      setLoginForm((prev) => ({ ...prev, email: fpEmail, password: '' }))
      setForgotStep('done')
      setFpCode('')
      setFpResetToken('')
      setFpNewPass('')
      setFpNewPass2('')
    } catch {
      toast.error('Erro de rede')
    } finally {
      setFpLoading(false)
    }
  }

  // Dados - mantidos para compatibilidade, mas serão migrados para React Query gradualmente
  // Proposals agora via React Query
  const { data: proposals = [], refetch: refetchProposals } = useProposals()
  const [users, setUsers] = useState([])
  const [solicitacoes, setSolicitacoes] = useState([]) // movimentações para métricas macro no dashboard gestor
  const [userGoals, setUserGoals] = useState([])
  const [clientes, setClientes] = useState([])
  const [sessions, setSessions] = useState([])

  // Service Worker para cache
  useServiceWorker()

  // Command palette
  const [commandOpen, setCommandOpen] = useState(false)

  // Constantes importadas de lib/constants.js

  // Persistência de sessão no sessionStorage (sessão do navegador, não persiste após fechar)
  const saveSessionToStorage = (user, sessionId, tokenValue) => {
    try {
      // Novo prefixo ERP
      sessionStorage.setItem('erp_user', JSON.stringify(user))
      sessionStorage.setItem('erp_session', sessionId)
      sessionStorage.setItem('erp_last_activity', Date.now().toString())
      if (tokenValue) sessionStorage.setItem('erp_token', tokenValue)
      // Cleanup chaves antigas (CRM)
      try {
        sessionStorage.removeItem('crm_user')
        sessionStorage.removeItem('crm_session')
        sessionStorage.removeItem('crm_last_activity')
        sessionStorage.removeItem('crm_token')
      } catch (_) {}
    } catch (_) {
      // ignore quota or storage errors
    }
  }
  const clearSessionFromStorage = () => {
    try {
      sessionStorage.removeItem('erp_user')
      sessionStorage.removeItem('erp_session')
      sessionStorage.removeItem('erp_last_activity')
      sessionStorage.removeItem('erp_token')
      // Legacy cleanup
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
      // Tenta ler ERP primeiro
      let user = sessionStorage.getItem('erp_user')
      let session = sessionStorage.getItem('erp_session')
      let lastActivity = sessionStorage.getItem('erp_last_activity')
      let savedToken = sessionStorage.getItem('erp_token')

      // Se não existir, tenta migrar do legado CRM
      if (!user || !session) {
        const legacyUser = sessionStorage.getItem('crm_user')
        const legacySession = sessionStorage.getItem('crm_session')
        const legacyLast = sessionStorage.getItem('crm_last_activity')
        const legacyToken = sessionStorage.getItem('crm_token')
        if (legacyUser && legacySession) {
          // Migra para as novas chaves
          sessionStorage.setItem('erp_user', legacyUser)
          sessionStorage.setItem('erp_session', legacySession)
          if (legacyLast) sessionStorage.setItem('erp_last_activity', legacyLast)
          if (legacyToken) sessionStorage.setItem('erp_token', legacyToken)
          try {
            sessionStorage.removeItem('crm_user')
            sessionStorage.removeItem('crm_session')
            sessionStorage.removeItem('crm_last_activity')
            sessionStorage.removeItem('crm_token')
          } catch (_) {}
          // Reatribui variáveis locais
          user = legacyUser
          session = legacySession
          lastActivity = legacyLast
          savedToken = legacyToken
        }
      }

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
        body: JSON.stringify(loginForm),
      })
      const result = await response.json()
      if (response.ok) {
        setCurrentUser(result.user)
        setSessionId(result.sessionId)
        setLastActivity(Date.now())
        setToken(result.token)
        saveSessionToStorage(result.user, result.sessionId, result.token)
        // Define aba inicial conforme permissões
        const u = result.user
        if (hasPermission(u, 'viewPropostas')) setActiveTab('propostas')
        else if (hasPermission(u, 'viewMovimentacao')) setActiveTab('movimentacao')
        else setActiveTab('dashboard')
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
          body: JSON.stringify({ sessionId }),
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
      // Propostas
      // Proposals já carregadas via React Query; opcionalmente refetch paralelo
      refetchProposals()
      // Solicitações
      fetches.push(fetch('/api/solicitacoes', { headers: authHeaders, ...common }))
      // Carteira de clientes: consultor e gestor
      const needsClientes =
        currentUser &&
        ['consultor', 'gestor', 'analista_cliente'].includes(currentUser.tipo_usuario)
      if (needsClientes)
        fetches.push(
          fetch('/api/clientes?fields=list&page=1&pageSize=50', { headers: authHeaders, ...common })
        )
      // Users e Sessions: apenas gestor precisa
      const needsAdminData = currentUser && currentUser.tipo_usuario === 'gestor'
      if (needsAdminData) fetches.push(fetch('/api/users', { headers: authHeaders, ...common }))
      // Metas: agora também para consultor (exibe progresso pessoal)
      const needsGoals = true
      if (needsGoals) fetches.push(fetch('/api/goals', { headers: authHeaders, ...common }))
      if (needsAdminData) fetches.push(fetch('/api/sessions', { headers: authHeaders, ...common }))

      const responses = await Promise.all(fetches)
      let idx = 0
      const solicitacoesRes = responses[idx++]
      // proposals via react-query
      if (solicitacoesRes?.ok) {
        const json = await solicitacoesRes.json()
        // endpoint retorna { data: [], ... }
        if (Array.isArray(json.data)) setSolicitacoes(json.data)
      }
      if (needsClientes) {
        const clientesRes = responses[idx++]
        if (clientesRes?.ok) {
          const json = await clientesRes.json()
          const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : []
          setClientes(arr)
        }
      }
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
        // Carrega presença (online) imediatamente após dados administrativos
        try {
          const onlineRes = await fetch('/api/users/online', { headers: authHeaders, ...common })
          if (onlineRes.ok) {
            const onlineJson = await onlineRes.json()
            // Anexa campo transient isOnline aos usuarios (não persiste)
            if (Array.isArray(onlineJson.data)) {
              setUsers((prev) =>
                prev.map((u) => ({
                  ...u,
                  isOnline: onlineJson.data.some((o) => String(o.id) === String(u.id)),
                }))
              )
            }
          }
        } catch {}
      }
      // Atualiza ultimo_refresh otimista no cliente para refletir atividade (será consolidado via ping)
      try {
        if (currentUser) {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === currentUser.id ? { ...u, ultimo_refresh: new Date().toISOString() } : u
            )
          )
        }
      } catch {}
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }, [token, currentUser, refetchProposals])

  // Debounce simples para evitar múltiplos loadData encadeados (ex: criar + atualizar status)
  const loadDataDebouncedRef = useRef({ timer: null, pending: false })
  const scheduleLoadData = useCallback(
    (immediate = false) => {
      const ref = loadDataDebouncedRef.current
      if (immediate) {
        if (ref.timer) {
          clearTimeout(ref.timer)
          ref.timer = null
        }
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
    },
    [loadData]
  )

  // Atalho de teclado para abrir palette (Ctrl+K / Cmd+K)
  useEffect(() => {
    const onKey = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen((o) => !o)
      }
      if (e.key === 'Escape') setCommandOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Handlers de propostas
  const handleCreateProposal = async (payload) => {
    setIsLoading(true)
    try {
      const {
        afterSuccess,
        cnpjValidationData: _ignore,
        _docs: pendingDocs = [],
        ...body
      } = payload || {}
      // Segurança mínima: sanitizar email no cliente
      if (body.consultor_email) body.consultor_email = String(body.consultor_email).trim()
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (response.ok) {
        toast.success('Proposta criada com sucesso!')
        afterSuccess && afterSuccess()
        // Otimista: insere nova proposta imediatamente sem esperar round-trip completo
        if (result && result.id) {
          queryClient.setQueryData(queryKeys.proposals, (old = []) => {
            if (old.some((p) => p.id === result.id)) return old
            return [...old, result]
          })
          // Persistência assíncrona dos metadados dos documentos anexados (se houverem)
          if (Array.isArray(pendingDocs) && pendingDocs.length > 0) {
            ;(async () => {
              for (const doc of pendingDocs) {
                try {
                  const respMeta = await fetch('/api/proposals/files', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      proposta_id: result.id,
                      path: doc.path,
                      nome: doc.nome,
                      mime: doc.mime,
                      tamanho_bytes: doc.tamanho_bytes,
                      bucket: doc.bucket || 'implantacao_upload',
                    }),
                  })
                  if (!respMeta.ok) {
                    // log silencioso; não bloquear fluxo principal
                    console.warn('Falha registrar metadata doc proposta', await respMeta.text())
                  }
                } catch (e) {
                  console.warn('Erro network registrar metadata doc', e)
                }
              }
              // Opcional: poderia disparar evento custom para recarregar docs quando detalhe aberto
              try {
                window.dispatchEvent(
                  new CustomEvent('proposta:docs-updated', { detail: { id: result.id } })
                )
              } catch {}
            })()
          }
        }
        refetchProposals()
      } else {
        console.error('Erro ao criar proposta:', result)
        toast.error(result.error || result.message || 'Erro ao criar proposta')
      }
    } catch (error) {
      console.error('Erro de conexão:', error)
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setIsLoading(false)
    }
  }

  /*
  const handleDeleteProposal = async (proposalId) => {
    if (currentUser?.tipo_usuario === 'consultor') setActiveTab('propostas')
    else if (currentUser?.tipo_usuario === 'gestor') setActiveTab('dashboard')
    else if (currentUser && !hasPermission(currentUser,'viewPropostas') && hasPermission(currentUser,'viewMovimentacao')) setActiveTab('movimentacao')
    else setActiveTab('dashboard')
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
      const doPatch = () =>
        fetch(`/api/proposals/${proposalId}`, {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      // Otimista via React Query
      const prevCache = queryClient.getQueryData(queryKeys.proposals)
      queryClient.setQueryData(queryKeys.proposals, (old = []) =>
        old.map((p) => (p.id === proposalId ? { ...p, status: payload.status } : p))
      )
      let response = await doPatch()
      if (!response.ok && response.status === 404) {
        // pequena espera para caso de claim implícito
        await new Promise((r) => setTimeout(r, 180))
        const retry = await doPatch()
        if (retry.ok) response = retry
      }
      if (response.ok) {
        toast.success('Status da proposta atualizado com sucesso!')
        refetchProposals()
        return
      }
      if (response.status === 404) {
        const result = await response.json().catch(() => ({}))
        toast.error(result.error || 'Proposta não encontrada. Recarregando...')
        queryClient.setQueryData(queryKeys.proposals, prevCache)
        refetchProposals()
        return
      }
      if (response.status === 403) {
        toast.error('Ação não permitida (verifique se você assumiu a proposta)')
        queryClient.setQueryData(queryKeys.proposals, prevCache)
        refetchProposals()
        return
      }
      const result = await response.json().catch(() => ({}))
      toast.error(result.error || 'Erro ao atualizar status')
      queryClient.setQueryData(queryKeys.proposals, prevCache)
      refetchProposals()
    } catch {
      toast.error('Erro ao conectar com o servidor')
      refetchProposals()
    }
  }

  const handlePatchProposal = async (proposalId, payload) => {
    const { queryClient } = await import('@/lib/query-client')
    const { updateAllProposalsCaches } = await import('@/lib/query-client')
    let rollback
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      // Otimista: aplica merge em todas as caches de propostas
      const prevSnapshots = queryClient.getQueriesData({ queryKey: ['proposals'] })
      rollback = () => {
        prevSnapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
      }
      updateAllProposalsCaches((list) =>
        list.map((p) => (p.id === proposalId ? { ...p, ...payload } : p))
      )
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        toast.success('Proposta atualizada com sucesso!')
        refetchProposals()
        return { ok: true }
      }
      const result = await response.json().catch(() => ({}))
      rollback?.()
      toast.error(result.error || 'Erro ao atualizar proposta')
      refetchProposals()
      return { ok: false, error: result.error }
    } catch {
      rollback?.()
      toast.error('Erro ao conectar com o servidor')
      refetchProposals()
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
            setProposals((prev) => {
              const exists = prev.some((p) => p.id === msg.data.id)
              return exists
                ? prev.map((p) => (p.id === msg.data.id ? { ...p, ...msg.data } : p))
                : [...prev, msg.data]
            })
          }
        } catch (_) {}
      }
      es.onerror = () => {
        try {
          es.close()
        } catch {}
      }
    } catch {}
    return () => {
      try {
        es && es.close()
      } catch {}
    }
  }, [currentUser])

  // SSE presença online em tempo quase real (gestor)
  useEffect(() => {
    if (!currentUser || currentUser.tipo_usuario !== 'gestor') return
    let es
    try {
      es = new EventSource('/api/users/online/events')
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg?.type === 'online_presence' && Array.isArray(msg.ids)) {
            setUsers((prev) =>
              prev.map((u) => ({
                ...u,
                isOnline: msg.ids.some((id) => String(id) === String(u.id)),
              }))
            )
          }
        } catch {}
      }
      es.onerror = () => {
        try {
          es.close()
        } catch {}
      }
    } catch {}
    return () => {
      try {
        es && es.close()
      } catch {}
    }
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
        body: JSON.stringify(body),
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
        body: JSON.stringify({
          usuario_id: usuarioId,
          valor_meta: valorMeta,
          ...(typeof valorAlcancado === 'number' ? { valor_alcancado: valorAlcancado } : {}),
        }),
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

  const handleDeleteUser = async (usuarioId) => {
    if (!usuarioId) return
    if (!window.confirm('Confirmar exclusão deste usuário? Esta ação é irreversível.')) return
    try {
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`/api/users?id=${encodeURIComponent(usuarioId)}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Usuário excluído')
        await loadData()
      } else {
        toast.error(data.error || 'Erro ao excluir usuário')
      }
    } catch {
      toast.error('Erro ao conectar com o servidor')
    }
  }

  // Auto refresh e atividade
  const updateActivity = useCallback(() => {
    const now = Date.now()
    setLastActivity(now)
    if (currentUser) {
      try {
        sessionStorage.setItem('erp_last_activity', now.toString())
        // limpeza legado
        sessionStorage.removeItem('crm_last_activity')
      } catch (_) {}
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
            body: JSON.stringify({ sessionId }),
          })
        } catch {}
      }
      const pingInterval = setInterval(ping, 60000)
      ping()
      return () => {
        clearInterval(interval)
        clearInterval(pingInterval)
      }
    }
  }, [currentUser, autoRefreshData, sessionId, token])

  useEffect(() => {
    if (currentUser) {
      const handleActivity = () => updateActivity()
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
      events.forEach((event) => document.addEventListener(event, handleActivity, true))
      return () => {
        events.forEach((event) => document.removeEventListener(event, handleActivity, true))
      }
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
              <Image
                src="/logo-belz.jpg"
                alt="Logo Belz"
                width={120}
                height={60}
                className="mx-auto rounded-lg"
                priority
              />
            </div>
            <CardTitle className="text-2xl text-primary font-montserrat">
              Sistema de Gestão - Belz
            </CardTitle>
            <CardDescription>Faça login para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {forgotStep === 'email' && (
              <form onSubmit={requestCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fp-email">Email cadastrado</Label>
                  <Input
                    id="fp-email"
                    type="email"
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setForgotStep('login')}
                    disabled={fpLoading}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={fpLoading}>
                    {fpLoading ? 'Enviando...' : 'Enviar código'}
                  </Button>
                </div>
              </form>
            )}
            {forgotStep === 'code' && (
              <form onSubmit={verifyCode} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enviamos um código de 6 dígitos para o email informado (se existir).
                </p>
                <div className="space-y-2">
                  <Label htmlFor="fp-code">Código</Label>
                  <Input
                    id="fp-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={fpCode}
                    onChange={(e) => setFpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setForgotStep('email')}
                    disabled={fpLoading}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={fpLoading || fpCode.length !== 6}
                  >
                    {fpLoading ? 'Verificando...' : 'Verificar'}
                  </Button>
                </div>
              </form>
            )}
            {forgotStep === 'reset' && (
              <form onSubmit={submitReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fp-pass1">Nova senha</Label>
                  <Input
                    id="fp-pass1"
                    type="password"
                    value={fpNewPass}
                    onChange={(e) => setFpNewPass(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fp-pass2">Confirmar senha</Label>
                  <Input
                    id="fp-pass2"
                    type="password"
                    value={fpNewPass2}
                    onChange={(e) => setFpNewPass2(e.target.value)}
                    required
                  />
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li>Mínimo 8 caracteres</li>
                  <li>Ao menos 1 maiúscula, 1 minúscula e 1 dígito</li>
                </ul>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setForgotStep('code')}
                    disabled={fpLoading}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={fpLoading}>
                    {fpLoading ? 'Salvando...' : 'Redefinir'}
                  </Button>
                </div>
              </form>
            )}
            {forgotStep === 'done' && (
              <div className="space-y-4 text-center">
                <p className="text-sm">Senha redefinida com sucesso.</p>
                <Button className="w-full" onClick={() => setForgotStep('login')}>
                  Voltar para login
                </Button>
              </div>
            )}
            {forgotStep === 'login' && (
              <div className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('email')
                      setFpEmail(loginForm.email || '')
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueci a senha
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // App principal
  return (
    <div className="min-h-screen bg-background belz5-layout font-inter">
      <Toaster />
      <Sidebar currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="md:ml-64 min-h-screen flex flex-col">
        <Header
          activeTab={activeTab}
          currentUser={currentUser}
          leftSlot={
            <div className="md:hidden">
              <MobileSidebar
                currentUser={currentUser}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onRefresh={autoRefreshData}
                onLogout={handleLogout}
              />
            </div>
          }
          rightSlot={
            <TopUserActions
              currentUser={currentUser}
              onRefresh={autoRefreshData}
              onLogout={handleLogout}
            />
          }
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          {/* Command Palette Trigger Hint */}
          <div className="hidden md:flex justify-end -mt-2 mb-2 pr-1">
            <button
              onClick={() => setCommandOpen(true)}
              className="group inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border px-2 py-1 rounded-md bg-background/50"
            >
              <Search className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
              <span>Comandos</span>
              <kbd className="font-mono text-[9px] px-1 py-0.5 rounded bg-muted">Ctrl+K</kbd>
            </button>
          </div>
          {/** Para consultor: restringe Propostas/Dashboard */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {hasPermission(currentUser, 'viewPropostas') && (
              <TabsContent value="propostas" className="space-y-6">
                {(() => {
                  const proposalsForView =
                    currentUser.tipo_usuario === 'gestor'
                      ? proposals
                      : currentUser.tipo_usuario === 'consultor'
                        ? proposals.filter(
                            (p) =>
                              String(p.criado_por) === String(currentUser.id) ||
                              (p.consultor_email &&
                                String(p.consultor_email).toLowerCase() ===
                                  String(currentUser.email || '').toLowerCase())
                          )
                        : proposals.filter(
                            (p) =>
                              // Analista: vê as que criou, as que assumiu ou ainda não atribuídas (para poder assumir)
                              String(p.criado_por) === String(currentUser.id) ||
                              String(p.atendido_por) === String(currentUser.id) ||
                              !p.atendido_por
                          )
                  return (
                    <LazyProposalsSection
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
                  const proposalsForView = (() => {
                    const role = currentUser.tipo_usuario
                    if (role === 'gestor' || role === 'gerente') return proposals
                    if (role === 'consultor') {
                      return proposals.filter(
                        (p) =>
                          String(p.criado_por) === String(currentUser.id) ||
                          (p.consultor_email &&
                            String(p.consultor_email).toLowerCase() ===
                              String(currentUser.email || '').toLowerCase())
                      )
                    }
                    if (role === 'analista_implantacao') {
                      return proposals.filter(
                        (p) =>
                          String(p.criado_por) === String(currentUser.id) ||
                          String(p.atendido_por) === String(currentUser.id) ||
                          !p.atendido_por
                      )
                    }
                    if (role === 'analista_movimentacao') {
                      return proposals.filter(
                        (p) =>
                          String(p.criado_por) === String(currentUser.id) ||
                          String(p.atendido_por) === String(currentUser.id) ||
                          !p.atendido_por
                      )
                    }
                    return []
                  })()

                  if (currentUser.tipo_usuario === 'consultor') {
                    const ConsultorDashboardSection =
                      require('./sections/ConsultorDashboard.jsx').default
                    return (
                      <ConsultorDashboardSection
                        currentUser={currentUser}
                        proposals={proposalsForView}
                        userGoals={userGoals}
                      />
                    )
                  }
                  return (
                    <DashboardSection
                      currentUser={currentUser}
                      proposals={proposalsForView}
                      users={users}
                      userGoals={userGoals}
                      solicitacoes={solicitacoes}
                    />
                  )
                })()}
              </TabsContent>
            )}

            {hasPermission(currentUser, 'viewMovimentacao') && (
              <TabsContent value="movimentacao" className="space-y-6">
                <LazyMovimentacaoSection currentUser={currentUser} token={token} />
              </TabsContent>
            )}

            {hasPermission(currentUser, 'manageUsers') && (
              <TabsContent value="usuarios" className="space-y-6">
                <LazyUsersSection
                  currentUser={currentUser}
                  users={users}
                  proposals={proposals}
                  userGoals={userGoals}
                  onCreateUser={handleCreateUser}
                  onUpdateUserGoal={handleUpdateUserGoal}
                  onDeleteUser={handleDeleteUser}
                  isLoading={isLoading}
                />
              </TabsContent>
            )}

            {hasPermission(currentUser, 'viewRelatorios') && (
              <TabsContent value="relatorios" className="space-y-6">
                <LazyReportsSection
                  users={users}
                  sessions={sessions}
                  proposals={proposals}
                  onRefresh={autoRefreshData}
                />
              </TabsContent>
            )}

            {['consultor', 'gestor', 'analista_cliente'].includes(currentUser.tipo_usuario) && (
              <TabsContent value="carteira" className="space-y-6">
                {(() => {
                  const Carteira = require('./sections/CarteiraClientes.jsx').default
                  return (
                    <Carteira currentUser={currentUser} token={token} initialClientes={clientes} />
                  )
                })()}
              </TabsContent>
            )}

            {/* Abas em desenvolvimento - apenas gestor */}
            {currentUser.tipo_usuario === 'gestor' && (
              <>
                <TabsContent value="simulador">
                  <EmDesenvolvimento
                    titulo="Simulador"
                    descricao="Ferramenta de simulação de planos e cenários."
                  />
                </TabsContent>
                <TabsContent value="financeiro">
                  <EmDesenvolvimento
                    titulo="Financeiro"
                    descricao="Gestão financeira e comissionamentos."
                  />
                </TabsContent>
                <TabsContent value="processos">
                  <EmDesenvolvimento
                    titulo="Processos"
                    descricao="Orquestração e automação de fluxos internos."
                  />
                </TabsContent>
                <TabsContent value="ia-belz">
                  <EmDesenvolvimento
                    titulo="IA Belz"
                    descricao="Recursos de inteligência artificial e insights."
                  />
                </TabsContent>
                <TabsContent value="universidade">
                  <EmDesenvolvimento
                    titulo="Universidade"
                    descricao="Portal de treinamentos e capacitações."
                  />
                </TabsContent>
                <TabsContent value="leads">
                  <EmDesenvolvimento
                    titulo="Leads"
                    descricao="Gestão de leads e funil comercial."
                  />
                </TabsContent>
                <TabsContent value="materiais">
                  <EmDesenvolvimento
                    titulo="Materiais"
                    descricao="Repositório central de materiais e documentos."
                  />
                </TabsContent>
                <TabsContent value="portal-cliente">
                  <EmDesenvolvimento
                    titulo="Portal do Cliente"
                    descricao="Área dedicada para interação com clientes."
                  />
                </TabsContent>
                <TabsContent value="contatos">
                  <EmDesenvolvimento
                    titulo="Contatos"
                    descricao="Diretório e gestão de contatos estratégicos."
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        </main>
      </div>
      {/* Command Palette extraída para reduzir conflitos em merges */}
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        currentUser={currentUser}
        setActiveTab={setActiveTab}
        scheduleLoadData={scheduleLoadData}
        handleLogout={handleLogout}
      />
    </div>
  )
}

// Export principal com Providers globais
export default function App() {
  return (
    <QueryProvider>
      <AppContent />
    </QueryProvider>
  )
}
