'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { hasPermission } from '@/lib/rbac'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  const saveSession = (user, sid, tok) => {
    try {
      if (user) sessionStorage.setItem('erp_user', JSON.stringify(user))
      if (sid) sessionStorage.setItem('erp_session', sid)
      if (tok) sessionStorage.setItem('erp_token', tok)
      sessionStorage.setItem('erp_last_activity', Date.now().toString())
    } catch {}
  }
  const clearSession = () => {
    try {
      ;['erp_user','erp_session','erp_token','erp_last_activity','crm_user','crm_session','crm_token','crm_last_activity'].forEach(k=>sessionStorage.removeItem(k))
    } catch {}
  }
  const loadSession = () => {
    try {
      const userRaw = sessionStorage.getItem('erp_user') || sessionStorage.getItem('crm_user')
      const sid = sessionStorage.getItem('erp_session') || sessionStorage.getItem('crm_session')
      const tok = sessionStorage.getItem('erp_token') || sessionStorage.getItem('crm_token')
      if (userRaw && sid) {
        setCurrentUser(JSON.parse(userRaw))
        setSessionId(sid)
        if (tok) setToken(tok)
        return true
      }
    } catch {}
    return false
  }

  // bootstrap
  useEffect(() => {
    const have = loadSession()
    if (!have) {
      ;(async () => {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' })
          if (res.ok) {
            const data = await res.json().catch(()=>({}))
            if (data?.user) {
              setCurrentUser(data.user)
              if (data.sessionId) setSessionId(data.sessionId)
              saveSession(data.user, data.sessionId, null)
            }
          }
        } catch {}
        setLoading(false)
      })()
    } else {
      setLoading(false)
    }
  }, [])

  // renovar token se necessário
  useEffect(() => {
    if (currentUser && !token) {
      ;(async () => {
        try {
          const res = await fetch('/api/auth/renew', { credentials: 'include' })
          if (res.ok) {
            const d = await res.json().catch(()=>({}))
            if (d.token) { setToken(d.token); saveSession(currentUser, sessionId, d.token) }
          }
        } catch {}
      })()
    }
  }, [currentUser, token, sessionId])

  const login = async ({ email, password }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json().catch(()=>({}))
    if (!res.ok) {
      toast.error(data.error || 'Erro no login')
      return { ok:false, error: data.error }
    }
    setCurrentUser(data.user)
    setSessionId(data.sessionId)
    setToken(data.token)
    saveSession(data.user, data.sessionId, data.token)
    toast.success('Login realizado com sucesso!')
    return { ok:true }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    clearSession()
    setCurrentUser(null)
    setSessionId(null)
    setToken(null)
  }

  const refreshCurrentUser = async () => {
    try {
      const tok = token || sessionStorage.getItem('erp_token') || sessionStorage.getItem('crm_token')
      const res = await fetch('/api/auth/me', {
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json().catch(()=>({}))
        if (data?.user) {
          setCurrentUser(data.user)
          saveSession(data.user, sessionId, token)
          return { ok: true, user: data.user }
        }
      }
      return { ok: false }
    } catch {
      return { ok: false }
    }
  }

  const value = {
    currentUser,
    sessionId,
    token,
    loading,
    login,
    logout,
    refreshCurrentUser,
    hasPermission: (u, perm) => hasPermission(u || currentUser, perm),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
